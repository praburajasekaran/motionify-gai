import os
import hashlib
import json
import pathlib
import shutil
import socket
import subprocess
import tempfile
import textwrap
import unittest
from unittest import mock

SCRIPT = pathlib.Path(__file__).with_name('backup.py')


class BackupTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.store = self.root / 'store'
        self.store.mkdir()
        self.commands = self.root / 'commands'
        self.commands.write_text('''#!/usr/bin/env python3
import os, pathlib, shutil, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
if os.environ.get('FAIL_COMMAND') == name: sys.exit(2)
if name == 'pg_dump' and args != ['--version'] and os.environ.get('FAIL_DUMP'): sys.exit(2)
if name == 'aws' and os.environ.get('FAIL_UPLOAD') and args[-1].startswith('s3://') and args[-1].endswith(os.environ['FAIL_UPLOAD']): sys.exit(2)
if name == 'pg_dump':
    if args == ['--version']: print('pg_dump (PostgreSQL) 17.6')
    else: pathlib.Path(args[args.index('--file')+1]).write_bytes(b'postgres archive')
elif name == 'pg_restore': pass
elif name == 'psql': print('17|motionify')
elif name == 'age': pathlib.Path(args[args.index('-o')+1]).write_bytes(b'encrypted:' + pathlib.Path(args[-1]).read_bytes())
elif name == 'aws':
    source, target = args[-2:]
    def path(value):
        if value.startswith('s3://'): return pathlib.Path(os.environ['FAKE_STORE']) / value[5:]
        return pathlib.Path(value)
    src, dst = path(source), path(target)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    if os.environ.get('CORRUPT_DOWNLOAD') and source.startswith('s3://'): dst.write_bytes(b'bad')
elif name == 'curl':
    data = sys.stdin.read()
    with open(os.environ['HEARTBEATS'], 'a') as f: f.write(data + '\\n')
''')
        self.commands.chmod(0o755)
        for name in ('pg_dump', 'pg_restore', 'psql', 'age', 'aws', 'curl'):
            (self.bin / name).symlink_to(self.commands)
        self.env = os.environ | {
            'PATH': str(self.bin) + os.pathsep + os.environ['PATH'],
            'BACKUP_DATABASE_URL': 'postgresql://user:secret@localhost/motionify',
            'BACKUP_BUCKET': 'backup-bucket', 'R2_ENDPOINT': 'https://example.invalid',
            'AGE_RECIPIENT': 'age1test', 'BACKUP_HEARTBEAT_URL': 'https://monitor.invalid/secret',
            'BACKUP_EXPECTED_HOST': 'localhost', 'BACKUP_EXPECTED_DATABASE': 'motionify',
            'FAKE_STORE': str(self.store), 'HEARTBEATS': str(self.root / 'heartbeats'),
            'BACKUP_RUN_ID': 'test-run', 'TMPDIR': str(self.root),
        }

    def run_backup(self):
        return subprocess.run(['python3', str(SCRIPT)], env=self.env, capture_output=True, text=True)

    def test_success_uploads_encrypted_archive_and_manifest_then_reports_success(self):
        result = self.run_backup()
        self.assertEqual(result.returncode, 0, result.stderr)
        objects = list(self.store.rglob('*'))
        archives = [p for p in objects if p.name.endswith('.dump.age')]
        self.assertEqual(len(archives), 1)
        self.assertTrue(archives[0].read_bytes().startswith(b'encrypted:'))
        manifests = [p for p in objects if p.name.endswith('.json')]
        self.assertEqual(len(manifests), 1)
        manifest = json.loads(manifests[0].read_text())
        self.assertEqual(manifest['object_key'], archives[0].relative_to(self.store / 'backup-bucket').as_posix())
        self.assertEqual(manifest['archive_bytes'], archives[0].stat().st_size)
        self.assertEqual(manifest['archive_sha256'], hashlib.sha256(archives[0].read_bytes()).hexdigest())
        self.assertNotIn('secret', result.stdout + result.stderr)
        self.assertEqual((self.root / 'heartbeats').read_text().strip(),
                         'url = "https://monitor.invalid/secret"')
        self.assertFalse(list(self.root.glob('motionify-backup-*')))

    def test_corrupt_upload_fails_and_never_reports_success(self):
        self.env['CORRUPT_DOWNLOAD'] = '1'
        result = self.run_backup()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(list(self.store.rglob('*.json')))
        self.assertIn('/fail', (self.root / 'heartbeats').read_text())
        self.assertFalse(list(self.root.glob('motionify-backup-*')))

    def test_dump_failure_reports_failure_and_cleans_up(self):
        self.env['FAIL_DUMP'] = '1'
        result = self.run_backup()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('/fail', (self.root / 'heartbeats').read_text())
        self.assertFalse(list(self.store.rglob('*.json')))
        self.assertFalse(list(self.root.glob('motionify-backup-*')))

    def test_upload_failure_reports_failure_and_cleans_up(self):
        for suffix in ('.dump.age', '.json'):
            with self.subTest(suffix=suffix):
                self.env['FAIL_UPLOAD'] = suffix
                (self.root / 'heartbeats').unlink(missing_ok=True)
                result = self.run_backup()
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual((self.root / 'heartbeats').read_text().count('url = '), 1)
                self.assertIn('/fail', (self.root / 'heartbeats').read_text())
                self.assertFalse(list(self.store.rglob('*.json')))
                self.assertFalse(list(self.root.glob('motionify-backup-*')))

    def test_insecure_database_uri_is_rejected(self):
        self.env['BACKUP_DATABASE_URL'] += '?sslmode=disable'
        result = self.run_backup()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(list(self.store.rglob('*.json')))

    def test_wrong_database_host_is_rejected(self):
        self.env['BACKUP_EXPECTED_HOST'] = 'other.invalid'
        result = self.run_backup()
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(list(self.store.rglob('*.json')))

    def test_workflow_failure_notifier_sends_failure_signal(self):
        workflow = SCRIPT.parents[2] / '.github/workflows/database-backup.yml'
        content = workflow.read_text()
        code = textwrap.dedent(content.split("          python3 - <<'PY'\n", 1)[1].split('          PY\n', 1)[0])
        response = mock.MagicMock()
        response.__enter__.return_value.status = 200
        with mock.patch.dict(os.environ, {'BACKUP_HEARTBEAT_URL': 'https://monitor.invalid/secret'}), \
             mock.patch('urllib.request.urlopen', return_value=response) as request:
            exec(compile(code, str(workflow), 'exec'), {})
        request.assert_called_once_with('https://monitor.invalid/secret/fail', timeout=15)

    @unittest.skipUnless(all(shutil.which(x) for x in ('initdb', 'pg_ctl', 'psql', 'pg_dump', 'pg_restore', 'openssl')),
                         'local PostgreSQL and OpenSSL are required')
    def test_real_postgres_archive_restores_synthetic_data(self):
        for name in ('pg_dump', 'pg_restore', 'psql'):
            (self.bin / name).unlink()
        data = self.root / 'postgres'
        subprocess.run(['initdb', '-D', str(data), '-U', 'backup_test', '-A', 'trust', '--no-locale'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['openssl', 'req', '-new', '-x509', '-nodes', '-days', '1', '-subj', '/CN=localhost',
                        '-addext', 'subjectAltName=DNS:localhost',
                        '-keyout', str(data / 'server.key'), '-out', str(data / 'server.crt')],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        (data / 'server.key').chmod(0o600)
        with (data / 'postgresql.conf').open('a') as conf:
            conf.write('\nssl = on\n')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        subprocess.run(['pg_ctl', '-D', str(data), '-l', str(self.root / 'postgres.log'),
                        '-o', f'-h 127.0.0.1 -p {port}', 'start'],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.addCleanup(subprocess.run, ['pg_ctl', '-D', str(data), '-m', 'immediate', 'stop'],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        source = f'postgresql://backup_test@localhost:{port}/postgres?sslmode=require'
        pg_env = os.environ | {'PGHOST': 'localhost', 'PGPORT': str(port), 'PGUSER': 'backup_test',
                               'PGDATABASE': 'postgres', 'PGSSLMODE': 'require'}
        subprocess.run(['psql', '-X', '-c', "CREATE TABLE backup_proof (value text); INSERT INTO backup_proof VALUES ('saved');"],
                       env=pg_env, check=True, stdout=subprocess.DEVNULL)
        subprocess.run(['psql', '-X', '-c', 'CREATE ROLE backup_reader LOGIN; GRANT pg_read_all_data TO backup_reader;'],
                       env=pg_env, check=True, stdout=subprocess.DEVNULL)
        self.env['BACKUP_DATABASE_URL'] = source.replace('backup_test@', 'backup_reader@')
        self.env['BACKUP_EXPECTED_HOST'] = 'localhost'
        self.env['BACKUP_EXPECTED_DATABASE'] = 'postgres'
        self.env['BACKUP_TLS_CA_FILE'] = str(self.root / 'missing-ca.crt')
        self.assertNotEqual(self.run_backup().returncode, 0)
        self.assertFalse(list(self.store.rglob('*.json')))
        self.env['BACKUP_TLS_CA_FILE'] = str(data / 'server.crt')
        tls_check = subprocess.run(['psql', '-X', '-tAc', 'SELECT 1'],
                                   env=pg_env | {'PGUSER': 'backup_reader', 'PGSSLMODE': 'verify-full',
                                                 'PGSSLROOTCERT': str(data / 'server.crt')},
                                   capture_output=True, text=True)
        self.assertEqual(tls_check.returncode, 0, tls_check.stderr)
        real_age = os.environ.get('BACKUP_TEST_AGE')
        if real_age:
            (self.bin / 'age').unlink()
            (self.bin / 'age').symlink_to(real_age)
            identity = self.root / 'identity.txt'
            subprocess.run([os.environ['BACKUP_TEST_AGE_KEYGEN'], '-o', str(identity)],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self.env['AGE_RECIPIENT'] = subprocess.check_output(
                [os.environ['BACKUP_TEST_AGE_KEYGEN'], '-y', str(identity)], text=True).strip()
        result = self.run_backup()
        self.assertEqual(result.returncode, 0, result.stderr)
        encrypted_path = next(self.store.rglob('*.dump.age'))
        archive = self.root / 'restore.dump'
        if real_age:
            subprocess.run([real_age, '-d', '-i', str(identity), '-o', str(archive), str(encrypted_path)], check=True)
        else:
            archive.write_bytes(encrypted_path.read_bytes().removeprefix(b'encrypted:'))
        subprocess.run(['psql', '-X', '-c', 'CREATE DATABASE backup_restore'], env=pg_env,
                       check=True, stdout=subprocess.DEVNULL)
        restore_env = pg_env | {'PGDATABASE': 'backup_restore'}
        subprocess.run(['pg_restore', '--no-owner', '--no-acl', '-d', 'backup_restore', str(archive)],
                       env=restore_env | {'PGHOST': '127.0.0.1', 'PGPORT': str(port), 'PGUSER': 'backup_test', 'PGSSLMODE': 'require'},
                       check=True, stdout=subprocess.DEVNULL)
        value = subprocess.check_output(['psql', '-X', '-A', '-t', '-c', 'SELECT value FROM backup_proof'], env=restore_env, text=True)
        self.assertEqual(value.strip(), 'saved')


if __name__ == '__main__':
    unittest.main()

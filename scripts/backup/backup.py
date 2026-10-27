#!/usr/bin/env python3
"""Create and verify an encrypted PostgreSQL archive in private R2 storage."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import parse_qs, unquote, urlparse


def run(args, *, env=None, stdin=None):
    return subprocess.run(args, env=env, input=stdin, text=True, stdout=subprocess.PIPE,
                          stderr=subprocess.PIPE, check=True).stdout.strip()


def digest(path):
    checksum = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            checksum.update(chunk)
    return checksum.hexdigest()


def heartbeat(url, suffix=''):
    # curl reads its URL from stdin, keeping the secret out of process arguments.
    if not url or not re.fullmatch(r'https://[A-Za-z0-9./_-]+', url):
        raise ValueError('A valid HTTPS heartbeat URL is required')
    run(['curl', '--fail', '--silent', '--show-error', '--max-time', '15', '--config', '-'],
        stdin=f'url = "{url.rstrip("/")}{suffix}"\n')


def backup():
    required = ['BACKUP_DATABASE_URL', 'BACKUP_BUCKET', 'R2_ENDPOINT', 'AGE_RECIPIENT',
                'BACKUP_HEARTBEAT_URL', 'BACKUP_RUN_ID', 'BACKUP_EXPECTED_HOST', 'BACKUP_EXPECTED_DATABASE']
    if any(not os.environ.get(name) for name in required):
        raise ValueError('Required backup configuration is missing')
    bucket = os.environ['BACKUP_BUCKET']
    run_id = os.environ['BACKUP_RUN_ID']
    endpoint = os.environ['R2_ENDPOINT']
    database_url = urlparse(os.environ['BACKUP_DATABASE_URL'])
    query = parse_qs(database_url.query, keep_blank_values=True)
    ssl_modes = query.get('sslmode', [])
    if (database_url.scheme not in ('postgres', 'postgresql') or not database_url.hostname
            or not database_url.path.strip('/') or len(ssl_modes) > 1
            or any(mode not in ('require', 'verify-ca', 'verify-full') for mode in ssl_modes)
            or any(k not in ('sslmode', 'channel_binding', 'connect_timeout') or len(v) != 1
                   for k, v in query.items())):
        raise ValueError('A TLS PostgreSQL URI is required')
    if (database_url.hostname != os.environ['BACKUP_EXPECTED_HOST']
            or unquote(database_url.path[1:]) != os.environ['BACKUP_EXPECTED_DATABASE']):
        raise ValueError('Backup database identity does not match configured target')
    if not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', bucket):
        raise ValueError('Invalid backup bucket')
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', run_id):
        raise ValueError('Invalid run identifier')
    if urlparse(endpoint).scheme != 'https':
        raise ValueError('The R2 endpoint must use HTTPS')

    env = {key: value for key, value in os.environ.items() if not key.startswith('PG')}
    env.pop('BACKUP_DATABASE_URL')
    env.update({'PGHOST': database_url.hostname, 'PGDATABASE': unquote(database_url.path[1:]),
                'PGSSLMODE': 'verify-full'})
    if os.environ.get('BACKUP_TLS_CA_FILE'):
        env['PGSSLROOTCERT'] = os.environ['BACKUP_TLS_CA_FILE']
    if database_url.port:
        env['PGPORT'] = str(database_url.port)
    if database_url.username:
        env['PGUSER'] = unquote(database_url.username)
    if database_url.password:
        env['PGPASSWORD'] = unquote(database_url.password)
    if 'channel_binding' in query:
        env['PGCHANNELBINDING'] = query['channel_binding'][0]
    if 'connect_timeout' in query:
        env['PGCONNECT_TIMEOUT'] = query['connect_timeout'][0]
    env['AWS_EC2_METADATA_DISABLED'] = 'true'
    now = datetime.datetime.now(datetime.timezone.utc)
    name = now.strftime('%Y%m%dT%H%M%SZ') + '-' + run_id
    key = f'backups/{name}'
    with tempfile.TemporaryDirectory(prefix='motionify-backup-') as directory:
        root = Path(directory)
        archive = root / 'database.dump'
        encrypted = root / 'database.dump.age'
        downloaded = root / 'download.age'
        manifest = root / 'manifest.json'
        version, database = run(['psql', '-X', '-A', '-t', '-c',
                                 "SELECT current_setting('server_version_num')::int / 10000 || '|' || current_database()"], env=env).split('|', 1)
        if database != os.environ['BACKUP_EXPECTED_DATABASE']:
            raise ValueError('Connected database does not match configured target')
        dump_version = run(['pg_dump', '--version'], env=env)
        run(['pg_dump', '--format=custom', '--file', str(archive)], env=env)
        run(['pg_restore', '--list', str(archive)], env=env)
        run(['age', '-r', os.environ['AGE_RECIPIENT'], '-o', str(encrypted), str(archive)], env=env)
        checksum = digest(encrypted)
        destination = f's3://{bucket}/{key}.dump.age'
        aws = ['aws', '--endpoint-url', endpoint, 's3', 'cp']
        run(aws + [str(encrypted), destination], env=env)
        run(aws + [destination, str(downloaded)], env=env)
        if digest(downloaded) != checksum:
            raise ValueError('Uploaded backup checksum does not match')
        manifest.write_text(json.dumps({'database': database, 'server_major': int(version), 'pg_dump_version': dump_version,
                                        'created_utc': now.isoformat(), 'archive_sha256': checksum,
                                        'archive_bytes': encrypted.stat().st_size,
                                        'object_key': key + '.dump.age'}) + '\n')
        run(aws + [str(manifest), f's3://{bucket}/{key}.json'], env=env)
    heartbeat(os.environ['BACKUP_HEARTBEAT_URL'])
    print('Encrypted backup uploaded and verified; monitoring notified.')


if __name__ == '__main__':
    try:
        backup()
    except Exception as error:
        operation = Path(error.cmd[0]).name if isinstance(error, subprocess.CalledProcessError) else type(error).__name__
        print(f'Backup failed during {operation}.', file=sys.stderr)
        try:
            heartbeat(os.environ.get('BACKUP_HEARTBEAT_URL', ''), '/fail')
        except Exception:
            print('Failure notification could not be sent.', file=sys.stderr)
        sys.exit(1)

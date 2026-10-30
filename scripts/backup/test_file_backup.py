import datetime as dt
from email.utils import format_datetime
import hashlib
import io
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import file_backup
import restore_files


class MissingObject(Exception):
    response = {'ResponseMetadata': {'HTTPStatusCode': 404}}


class MemoryBucket:
    def __init__(self, objects=None):
        self.objects = objects or {}
        self.corrupt_reads = False
        self.change_on_read = False
        self.retention_days = 395

    def get_paginator(self, _name):
        return self

    def paginate(self, **kwargs):
        yield {'Contents': [dict(Key=key, ETag=obj['etag'], Size=len(obj['data']),
                                 LastModified=obj['modified'])
                            for key, obj in self.objects.items() if key.startswith(kwargs.get('Prefix', ''))]}

    def head_object(self, *, Bucket, Key):
        if Key not in self.objects:
            raise MissingObject()
        obj = self.objects[Key]
        result = {'ETag': obj['etag'], 'ContentLength': len(obj['data']),
                'LastModified': obj['modified'], 'Metadata': obj.get('metadata', {}),
                'ContentType': obj.get('content_type', 'application/octet-stream')}
        if self.retention_days is not None:
            result['Expiration'] = 'expiry-date="' + format_datetime(obj['modified'] + dt.timedelta(days=self.retention_days), usegmt=True) + '"'
        return result

    def get_object(self, *, Bucket, Key, IfMatch=None):
        obj = self.objects[Key]
        if IfMatch and IfMatch != obj['etag']:
            raise ValueError('precondition failed')
        if self.change_on_read:
            obj['etag'] = 'changed'
        data = obj['data'] + (b'corrupt' if self.corrupt_reads else b'')
        return {'Body': io.BytesIO(data)}

    def upload_file(self, filename, bucket, key, ExtraArgs=None):
        self.objects[key] = {'data': Path(filename).read_bytes(), 'etag': 'uploaded',
                             'modified': dt.datetime.now(dt.timezone.utc),
                             'metadata': (ExtraArgs or {}).get('Metadata', {})}

    def put_object(self, *, Bucket, Key, Body, IfNoneMatch, Metadata):
        if Key in self.objects:
            raise ValueError('Object already exists')
        self.objects[Key] = {'data': Body.read(), 'etag': 'uploaded',
                             'modified': dt.datetime.now(dt.timezone.utc), 'metadata': Metadata}


def fake_encrypt(source, destination, _recipient):
    data = source.read()
    destination.write_bytes(data)
    return hashlib.sha256(data).hexdigest()


class FileBackupTests(unittest.TestCase):
    def setUp(self):
        self.source = MemoryBucket({'projects/test.mp4': {
            'data': b'video bytes', 'etag': 'original',
            'modified': dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc),
            'content_type': 'video/mp4'}})
        self.target = MemoryBucket()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.encrypt = patch.object(file_backup, 'encrypted_file', side_effect=fake_encrypt)
        self.encrypt.start()
        self.addCleanup(self.encrypt.stop)

    def copy(self, run='first'):
        return file_backup.copy_files(self.source, self.target, 'source', 'backup',
                                      'recipient', run, Path(self.temp.name))

    def test_backup_manifest_preserves_key_hash_and_content_type(self):
        self.assertEqual(self.copy(), 1)
        manifest = json.loads(self.target.objects['manifests/first.json.age']['data'])
        record = manifest['objects'][0]
        self.assertEqual(record['source_key'], 'projects/test.mp4')
        self.assertEqual(record['content_type'], 'video/mp4')
        self.assertEqual(record['plaintext_sha256'], hashlib.sha256(b'video bytes').hexdigest())
        self.assertEqual(self.target.objects[record['backup_key']]['data'], b'video bytes')

    def test_empty_bucket_produces_a_verified_empty_manifest(self):
        self.source.objects.clear()
        self.assertEqual(self.copy(), 0)
        manifest = json.loads(self.target.objects['manifests/first.json.age']['data'])
        self.assertEqual(manifest['objects'], [])
        self.assertIn('available_until', manifest)

    def test_changed_source_never_publishes_a_manifest(self):
        self.source.change_on_read = True
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.copy()
        self.assertNotIn('manifests/first.json.age', self.target.objects)

    def test_r2_head_second_precision_matches_fractional_list_timestamp(self):
        self.source.objects['projects/test.mp4']['modified'] = dt.datetime(
            2026, 1, 1, 0, 0, 0, 867000, tzinfo=dt.timezone.utc)
        original_head = self.source.head_object
        def truncated_head(**kwargs):
            head = original_head(**kwargs)
            head['LastModified'] = head['LastModified'].replace(microsecond=0)
            return head
        with patch.object(self.source, 'head_object', side_effect=truncated_head):
            self.assertEqual(self.copy(), 1)

    def test_changed_source_metadata_never_publishes_a_snapshot(self):
        original = self.source.head_object
        calls = 0
        def changed_head(**kwargs):
            nonlocal calls
            calls += 1
            result = original(**kwargs)
            if calls > 1:
                result['ContentType'] = 'application/pdf'
            return result
        with patch.object(self.source, 'head_object', side_effect=changed_head):
            with self.assertRaisesRegex(ValueError, 'changed'):
                self.copy()
        self.assertNotIn('manifests/first.complete', self.target.objects)

    def test_corrupt_recovery_bytes_never_publish_a_manifest(self):
        self.target.corrupt_reads = True
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.copy()
        self.assertNotIn('manifests/first.json.age', self.target.objects)

    def test_repeat_backup_reuses_immutable_version_and_keeps_existing_snapshot(self):
        self.copy()
        first = json.loads(self.target.objects['manifests/first.json.age']['data'])
        key = first['objects'][0]['backup_key']
        modified = self.target.objects[key]['modified']
        self.copy('second')
        second = json.loads(self.target.objects['manifests/second.json.age']['data'])
        self.assertEqual(second['objects'][0]['backup_key'], key)
        self.assertEqual(self.target.objects[key]['modified'], modified)
        self.assertGreater(dt.datetime.fromisoformat(second['available_until']),
                           dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=364))
        self.assertEqual(self.target.objects[key]['data'], b'video bytes')

    def test_new_generation_is_created_every_30_days(self):
        item = next(self.source.paginate())['Contents'][0]
        start = dt.datetime.fromtimestamp(30 * 86400 * 600, tz=dt.timezone.utc)
        first = file_backup.version_key(item, 'recipient', start)
        self.assertEqual(first, file_backup.version_key(item, 'recipient', start + dt.timedelta(days=29)))
        self.assertNotEqual(first, file_backup.version_key(item, 'recipient', start + dt.timedelta(days=30)))

    def test_reused_object_must_cover_the_full_snapshot_window(self):
        self.copy()
        manifest = json.loads(self.target.objects['manifests/first.json.age']['data'])
        key = manifest['objects'][0]['backup_key']
        self.target.objects[key]['modified'] -= dt.timedelta(days=31)
        with self.assertRaisesRegex(ValueError, 'required retention'):
            self.copy('second')
        self.assertNotIn('manifests/second.complete', self.target.objects)

    def test_corrupt_existing_copy_is_not_overwritten(self):
        self.copy()
        manifest = json.loads(self.target.objects['manifests/first.json.age']['data'])
        key = manifest['objects'][0]['backup_key']
        self.target.objects[key]['data'] = b'bad bytes'
        with self.assertRaisesRegex(ValueError, 'checksum'):
            self.copy('second')
        self.assertEqual(self.target.objects[key]['data'], b'bad bytes')
        self.assertNotIn('manifests/second.json.age', self.target.objects)

    def test_immutable_put_does_not_replace_an_existing_object(self):
        key = 'files/' + 'a' * 64 + '.age'
        self.target.objects[key] = {'data': b'original', 'etag': 'original',
                                    'modified': dt.datetime.now(dt.timezone.utc)}
        candidate = Path(self.temp.name) / 'candidate'
        candidate.write_bytes(b'replacement')
        with self.assertRaisesRegex(ValueError, 'already exists'):
            file_backup.put_immutable(self.target, 'backup', key, candidate)
        self.assertEqual(self.target.objects[key]['data'], b'original')

    def test_changed_and_deleted_files_remain_in_earlier_snapshot(self):
        self.copy()
        first = json.loads(self.target.objects['manifests/first.json.age']['data'])
        original = first['objects'][0]['backup_key']
        self.source.objects['projects/test.mp4']['data'] = b'new version'
        self.source.objects['projects/test.mp4']['etag'] = 'new'
        self.copy('second')
        second = json.loads(self.target.objects['manifests/second.json.age']['data'])
        self.assertNotEqual(original, second['objects'][0]['backup_key'])
        self.source.objects.clear()
        self.copy('third')
        self.assertEqual(self.target.objects[original]['data'], b'video bytes')
        self.assertEqual(json.loads(self.target.objects['manifests/third.json.age']['data'])['objects'], [])

    def test_short_lifecycle_expiry_rejects_snapshot(self):
        self.target.retention_days = 364
        with self.assertRaisesRegex(ValueError, 'required retention'):
            self.copy()
        self.assertNotIn('manifests/first.json.age', self.target.objects)

    def test_restore_checks_bytes_and_preserves_metadata_in_staging_index(self):
        self.copy()
        output = Path(self.temp.name) / 'restore'
        def fake_decrypt(source, destination, _identity):
            destination.write_bytes(source.read_bytes())
        with patch.object(restore_files, 'decrypt', side_effect=fake_decrypt):
            self.assertEqual(restore_files.restore(self.target, 'backup', 'manifests/first.json.age',
                                                   Path('identity'), output), 1)
        index = json.loads((output / 'index.json').read_text())
        record = index['objects'][0]
        self.assertEqual(record['source_key'], 'projects/test.mp4')
        self.assertEqual(record['content_type'], 'video/mp4')
        self.assertEqual((output / record['local_name']).read_bytes(), b'video bytes')

    def test_restore_can_select_a_file_and_rejects_unknown_keys(self):
        self.copy()
        output = Path(self.temp.name) / 'restore'
        with patch.object(restore_files, 'decrypt', side_effect=lambda src, dst, _: dst.write_bytes(src.read_bytes())):
            with self.assertRaisesRegex(ValueError, 'absent'):
                restore_files.restore(self.target, 'backup', 'manifests/first.json.age',
                                      Path('identity'), output, selected_keys={'unknown'})
            self.assertFalse(output.exists())
            self.assertEqual(restore_files.restore(self.target, 'backup', 'manifests/first.json.age',
                                                   Path('identity'), output,
                                                   selected_keys={'projects/test.mp4'}), 1)

    def test_restore_refuses_existing_directory_and_corrupt_data(self):
        self.copy()
        output = Path(self.temp.name) / 'restore'
        output.mkdir()
        with self.assertRaisesRegex(ValueError, 'must not exist'):
            restore_files.restore(self.target, 'backup', 'manifests/first.json.age', Path('identity'), output)
        output.rmdir()
        manifest = json.loads(self.target.objects['manifests/first.json.age']['data'])
        self.target.objects[manifest['objects'][0]['backup_key']]['data'] = b'corrupt'
        with patch.object(restore_files, 'decrypt', side_effect=lambda src, dst, _: dst.write_bytes(src.read_bytes())):
            with self.assertRaisesRegex(ValueError, 'checksum'):
                restore_files.restore(self.target, 'backup', 'manifests/first.json.age', Path('identity'), output)
        self.assertFalse(output.exists())

    def test_restore_refuses_incomplete_or_corrupted_manifest(self):
        self.copy()
        output = Path(self.temp.name) / 'restore'
        marker = self.target.objects.pop('manifests/first.complete')
        with self.assertRaises(KeyError):
            restore_files.restore(self.target, 'backup', 'manifests/first.json.age', Path('identity'), output)
        self.target.objects['manifests/first.complete'] = marker
        self.target.objects['manifests/first.json.age']['data'] += b'corrupt'
        with self.assertRaisesRegex(ValueError, 'Manifest checksum mismatch'):
            restore_files.restore(self.target, 'backup', 'manifests/first.json.age', Path('identity'), output)
        self.assertFalse(output.exists())

    def test_completed_run_identifier_is_not_reused(self):
        self.copy()
        with self.assertRaisesRegex(ValueError, 'already been completed'):
            self.copy()

    @unittest.skipUnless(shutil.which('age') and shutil.which('age-keygen'), 'age tools unavailable')
    def test_real_age_encryption_and_staged_restore(self):
        self.encrypt.stop()
        identity = Path(self.temp.name) / 'identity.txt'
        subprocess.run(['age-keygen', '-o', str(identity)], check=True, capture_output=True)
        recipient = subprocess.run(['age-keygen', '-y', str(identity)], check=True,
                                   capture_output=True, text=True).stdout.strip()
        file_backup.copy_files(self.source, self.target, 'source', 'backup', recipient,
                               'real', Path(self.temp.name))
        output = Path(self.temp.name) / 'real-restore'
        self.assertEqual(restore_files.restore(self.target, 'backup', 'manifests/real.json.age',
                                               identity, output), 1)
        index = json.loads((output / 'index.json').read_text())
        self.assertEqual((output / index['objects'][0]['local_name']).read_bytes(), b'video bytes')
        self.assertNotIn(b'video bytes', self.target.objects[index['objects'][0]['backup_key']]['data'])


if __name__ == '__main__':
    unittest.main()

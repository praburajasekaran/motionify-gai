"""Opt-in synthetic encryption and restore test against the recovery bucket."""

import datetime as dt
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from uuid import uuid4

from file_backup import copy_files, version_key
from restore_files import restore
from test_file_backup import MemoryBucket


@unittest.skipUnless(os.environ.get('FILE_BACKUP_R2_SYNTHETIC_TEST') == '1', 'R2 test not enabled')
class RealR2Tests(unittest.TestCase):
    def test_encrypted_immutable_backup_and_restore(self):
        import boto3
        if os.environ.get('FILE_BACKUP_BUCKET') != 'motionify-production-file-backups':
            self.fail('The synthetic test requires the designated recovery bucket')
        if not shutil.which('age') or not shutil.which('age-keygen'):
            self.fail('The age tools are required')
        client = boto3.client('s3', endpoint_url=os.environ['FILE_R2_ENDPOINT'], region_name='auto',
                              aws_access_key_id=os.environ['FILE_TARGET_ACCESS_KEY_ID'],
                              aws_secret_access_key=os.environ['FILE_TARGET_SECRET_ACCESS_KEY'])
        bucket = os.environ['FILE_BACKUP_BUCKET']
        run = 'synthetic_' + uuid4().hex
        source = MemoryBucket({'verification/' + run: {
            'data': b'synthetic-file-test', 'etag': 'synthetic-etag',
            'modified': dt.datetime.now(dt.timezone.utc), 'content_type': 'text/plain'}})
        with tempfile.TemporaryDirectory(prefix='motionify-r2-test-') as directory:
            root = Path(directory)
            identity = root / 'identity'
            subprocess.run(['age-keygen', '-o', str(identity)], check=True, capture_output=True)
            recipient = subprocess.run(['age-keygen', '-y', str(identity)], check=True,
                                       capture_output=True, text=True).stdout.strip()
            item = next(source.paginate())['Contents'][0]
            now = dt.datetime.now(dt.timezone.utc)
            for suffix in ('a', 'b'):
                self.assertEqual(copy_files(source, client, 'synthetic-source', bucket, recipient,
                                            run + '_' + suffix, root), 1)
            output = root / 'restored'
            self.assertEqual(restore(client, bucket, f'manifests/{run}_b.json.age', identity, output), 1)
            record = json.loads((output / 'index.json').read_text())['objects'][0]
            self.assertEqual((output / record['local_name']).read_bytes(), b'synthetic-file-test')
            self.assertEqual(record['content_type'], 'text/plain')
            key = record['backup_key']
            with self.assertRaises(client.exceptions.ClientError) as overwrite:
                client.put_object(Bucket=bucket, Key=key, Body=b'replacement')
            self.assertEqual(overwrite.exception.response['Error']['Code'], 'ObjectLockedByBucketPolicy')
            with self.assertRaises(client.exceptions.ClientError) as delete:
                client.delete_object(Bucket=bucket, Key=key)
            self.assertEqual(delete.exception.response['Error']['Code'], 'ObjectLockedByBucketPolicy')
            self.assertEqual(record['backup_key'], version_key(item, recipient, now))


if __name__ == '__main__':
    unittest.main()

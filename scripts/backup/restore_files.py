#!/usr/bin/env python3
"""Restore an encrypted file snapshot into a new local staging directory."""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

from file_backup import checksum


def decrypt(source, destination, identity):
    with destination.open('xb') as output:
        subprocess.run(['age', '--decrypt', '-i', str(identity), str(source)],
                       stdout=output, stderr=subprocess.DEVNULL, check=True)


def download(client, bucket, key, destination):
    response = client.get_object(Bucket=bucket, Key=key)
    try:
        with destination.open('xb') as output:
            for chunk in iter(lambda: response['Body'].read(1024 * 1024), b''):
                output.write(chunk)
    finally:
        response['Body'].close()


def restore(client, bucket, manifest_key, identity, output, selected_keys=None):
    if not re.fullmatch(r'manifests/[A-Za-z0-9_-]{1,128}\.json\.age', manifest_key):
        raise ValueError('Invalid manifest key')
    output = Path(output)
    if output.exists() or output.is_symlink():
        raise ValueError('Restore staging directory must not exist')
    with tempfile.TemporaryDirectory(prefix='.file-restore-', dir=output.parent) as temporary:
        root = Path(temporary)
        archive = root / 'manifest.age'
        plain = root / 'manifest.json'
        marker_key = manifest_key.removesuffix('.json.age') + '.complete'
        marker = root / 'complete.json'
        download(client, bucket, marker_key, marker)
        marker_data = json.loads(marker.read_text())
        download(client, bucket, manifest_key, archive)
        with archive.open('rb') as stream:
            if checksum(stream) != marker_data['manifest_sha256']:
                raise ValueError('Manifest checksum mismatch')
        decrypt(archive, plain, identity)
        manifest = json.loads(plain.read_text())
        expires = dt.datetime.fromisoformat(manifest['available_until'])
        if expires.tzinfo is None or dt.datetime.now(dt.timezone.utc) >= expires:
            raise ValueError('The snapshot recovery window has expired')
        stage = root / 'result'
        stage.mkdir(mode=0o700)
        seen = set()
        selected = None if selected_keys is None else set(selected_keys)
        records = []
        for record in manifest['objects']:
            source_key = record['source_key']
            backup_key = record['backup_key']
            if (not isinstance(source_key, str) or source_key in seen
                    or not re.fullmatch(r'files/[a-f0-9]{64}\.age', backup_key)):
                raise ValueError('Invalid snapshot record')
            seen.add(source_key)
            if selected is not None and source_key not in selected:
                continue
            encrypted = root / 'file.age'
            download(client, bucket, backup_key, encrypted)
            with encrypted.open('rb') as stream:
                if checksum(stream) != record['encrypted_sha256']:
                    raise ValueError('Encrypted file checksum mismatch')
            local_name = hashlib.sha256(source_key.encode('utf-8')).hexdigest()
            restored = stage / local_name
            decrypt(encrypted, restored, identity)
            encrypted.unlink()
            with restored.open('rb') as stream:
                if checksum(stream) != record['plaintext_sha256']:
                    raise ValueError('Restored file checksum mismatch')
            if restored.stat().st_size != record['size']:
                raise ValueError('Restored file size mismatch')
            records.append({**record, 'local_name': local_name})
        if selected is not None and not selected.issubset(seen):
            raise ValueError('A requested file is absent from the snapshot')
        (stage / 'index.json').write_text(json.dumps({**manifest, 'objects': records}, indent=2) + '\n')
        os.rename(stage, output)
    return len(records)


def main():
    import boto3
    bucket = os.environ['FILE_BACKUP_BUCKET']
    client = boto3.client('s3', endpoint_url=os.environ['FILE_R2_ENDPOINT'], region_name='auto',
                          aws_access_key_id=os.environ['FILE_TARGET_ACCESS_KEY_ID'],
                          aws_secret_access_key=os.environ['FILE_TARGET_SECRET_ACCESS_KEY'])
    if len(sys.argv) != 4:
        raise ValueError('Provide manifest key, age identity path, and new staging directory')
    os.umask(0o077)
    count = restore(client, bucket, sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3]))
    print(f'Restored and verified {count} files into the local staging directory.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('File restore failed; no completed staging directory was created.', file=sys.stderr)
        sys.exit(1)

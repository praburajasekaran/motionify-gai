#!/usr/bin/env python3
"""Copy R2 file versions into an encrypted recovery bucket."""

import datetime as dt
from email.utils import parsedate_to_datetime
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from urllib.parse import urlparse

from backup import heartbeat


def checksum(stream):
    digest = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b''):
        digest.update(chunk)
    return digest.hexdigest()


def version_key(item, recipient, now):
    identity = json.dumps({
        'key': item['Key'], 'etag': item['ETag'], 'size': item['Size'],
        'modified': item['LastModified'].isoformat(), 'recipient': recipient,
        'generation': int(now.timestamp()) // (30 * 86400),
    }, sort_keys=True, separators=(',', ':')).encode()
    return 'files/' + hashlib.sha256(identity).hexdigest() + '.age'


def encrypted_file(source, destination, recipient):
    process = subprocess.Popen(['age', '-r', recipient, '-o', str(destination)],
                               stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    plain = hashlib.sha256()
    try:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            plain.update(chunk)
            process.stdin.write(chunk)
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError('File encryption failed')
    except BaseException:
        if process.poll() is None:
            process.kill()
        process.wait()
        raise
    return plain.hexdigest()


def require_retention(head, snapshot_start):
    match = re.search(r'expiry-date="([^"]+)"', head.get('Expiration', ''))
    if not match:
        raise ValueError('Recovery object does not have the required retention')
    expiry = parsedate_to_datetime(match.group(1))
    if expiry.tzinfo is None or expiry < snapshot_start + dt.timedelta(days=365):
        raise ValueError('Recovery object does not have the required retention')
    return expiry


def put_immutable(target, bucket, key, path, metadata=None):
    if path.stat().st_size > 5 * 1024 ** 3:
        raise ValueError('Encrypted object exceeds the single-upload size limit')
    with path.open('rb') as stream:
        target.put_object(Bucket=bucket, Key=key, Body=stream, IfNoneMatch='*',
                          Metadata=metadata or {})


def matches_listing(head, item):
    return (head['ETag'] == item['ETag'] and head['ContentLength'] == item['Size']
            and head['LastModified'].replace(microsecond=0) == item['LastModified'].replace(microsecond=0))


def copy_files(source, target, source_bucket, target_bucket, recipient, run_id, root):
    now = dt.datetime.now(dt.timezone.utc)
    marker_key = f'manifests/{run_id}.complete'
    try:
        target.head_object(Bucket=target_bucket, Key=marker_key)
    except Exception as error:
        if getattr(error, 'response', {}).get('ResponseMetadata', {}).get('HTTPStatusCode') != 404:
            raise
    else:
        raise ValueError('The run identifier has already been completed')
    objects = []
    paginator = source.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=source_bucket):
        objects.extend(page.get('Contents', []))
    records = []
    for item in objects:
        head = source.head_object(Bucket=source_bucket, Key=item['Key'])
        if not matches_listing(head, item):
            raise ValueError('A source object changed during the backup')
        key = version_key(item, recipient, now)
        try:
            existing = target.head_object(Bucket=target_bucket, Key=key)
        except Exception as error:
            if getattr(error, 'response', {}).get('ResponseMetadata', {}).get('HTTPStatusCode') != 404:
                raise
            existing = None
        encrypted = root / 'file.age'
        if existing:
            expiry = require_retention(existing, now)
            metadata = existing.get('Metadata', {})
            plain_hash = metadata.get('plaintext-sha256')
            expected = metadata.get('encrypted-sha256')
            if not plain_hash or not expected:
                raise ValueError('A recovery object has incomplete metadata')
        else:
            obj = source.get_object(Bucket=source_bucket, Key=item['Key'], IfMatch=item['ETag'])
            try:
                plain_hash = encrypted_file(obj['Body'], encrypted, recipient)
            finally:
                obj['Body'].close()
            with encrypted.open('rb') as stream:
                expected = checksum(stream)
            put_immutable(target, target_bucket, key, encrypted,
                          {'plaintext-sha256': plain_hash, 'encrypted-sha256': expected})
            encrypted.unlink()
            existing = target.head_object(Bucket=target_bucket, Key=key)
            expiry = require_retention(existing, now)
        response = target.get_object(Bucket=target_bucket, Key=key, IfMatch=existing['ETag'])
        try:
            if checksum(response['Body']) != expected:
                raise ValueError('Recovery object checksum mismatch')
        finally:
            response['Body'].close()
        current = source.head_object(Bucket=source_bucket, Key=item['Key'])
        metadata_fields = ('Metadata', 'ContentType', 'CacheControl', 'ContentDisposition',
                           'ContentEncoding', 'ContentLanguage', 'Expires')
        if not matches_listing(current, item) or any(current.get(field) != head.get(field) for field in metadata_fields):
            raise ValueError('A source object changed during the backup')
        records.append({
            'source_key': item['Key'], 'backup_key': key, 'size': item['Size'],
            'source_etag': item['ETag'], 'source_modified': item['LastModified'].isoformat(),
            'backup_created': existing['LastModified'].isoformat(),
            'backup_expires': expiry.isoformat(),
            'plaintext_sha256': plain_hash, 'encrypted_sha256': expected,
            'content_type': head.get('ContentType'), 'cache_control': head.get('CacheControl'),
            'content_disposition': head.get('ContentDisposition'), 'content_encoding': head.get('ContentEncoding'),
            'content_language': head.get('ContentLanguage'), 'metadata': head.get('Metadata', {}),
            'content_expires': head['Expires'].isoformat() if head.get('Expires') else None,
        })
    manifest = root / 'manifest.age'
    available_until = now + dt.timedelta(days=365)
    payload = json.dumps({'source_bucket': source_bucket, 'created_utc': now.isoformat(),
                          'available_until': available_until.isoformat(), 'objects': records},
                         separators=(',', ':')).encode()
    encrypted_file(io.BytesIO(payload), manifest, recipient)
    with manifest.open('rb') as stream:
        expected = checksum(stream)
    manifest_key = f'manifests/{run_id}.json.age'
    put_immutable(target, target_bucket, manifest_key, manifest)
    require_retention(target.head_object(Bucket=target_bucket, Key=manifest_key), now)
    response = target.get_object(Bucket=target_bucket, Key=manifest_key)
    try:
        if checksum(response['Body']) != expected:
            raise ValueError('Recovery manifest checksum mismatch')
    finally:
        response['Body'].close()
    marker = root / 'complete.json'
    marker.write_text(json.dumps({'manifest_sha256': expected}))
    put_immutable(target, target_bucket, marker_key, marker)
    require_retention(target.head_object(Bucket=target_bucket, Key=marker_key), now)
    return len(records)


def main():
    required = ('FILE_SOURCE_BUCKET', 'FILE_BACKUP_BUCKET', 'FILE_R2_ENDPOINT',
                'FILE_SOURCE_ACCESS_KEY_ID', 'FILE_SOURCE_SECRET_ACCESS_KEY',
                'FILE_TARGET_ACCESS_KEY_ID', 'FILE_TARGET_SECRET_ACCESS_KEY',
                'FILE_AGE_RECIPIENT', 'FILE_BACKUP_HEARTBEAT_URL', 'FILE_BACKUP_RUN_ID')
    if any(not os.environ.get(name) for name in required):
        raise ValueError('Required file backup configuration is missing')
    source_bucket = os.environ['FILE_SOURCE_BUCKET']
    target_bucket = os.environ['FILE_BACKUP_BUCKET']
    if source_bucket == target_bucket or any(not re.fullmatch(r'[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]', value)
                                             for value in (source_bucket, target_bucket)):
        raise ValueError('Distinct source and recovery buckets are required')
    endpoint = urlparse(os.environ['FILE_R2_ENDPOINT'])
    if (endpoint.scheme != 'https' or not endpoint.hostname or endpoint.path not in ('', '/')
            or not re.fullmatch(r'[a-f0-9]{32}\.r2\.cloudflarestorage\.com', endpoint.hostname)
            or endpoint.username or endpoint.password or endpoint.port or endpoint.query or endpoint.fragment):
        raise ValueError('An HTTPS R2 endpoint is required')
    run_id = os.environ['FILE_BACKUP_RUN_ID']
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', run_id):
        raise ValueError('Invalid run identifier')
    import boto3
    def client(prefix):
        return boto3.client('s3', endpoint_url=os.environ['FILE_R2_ENDPOINT'], region_name='auto',
                            aws_access_key_id=os.environ[f'FILE_{prefix}_ACCESS_KEY_ID'],
                            aws_secret_access_key=os.environ[f'FILE_{prefix}_SECRET_ACCESS_KEY'])
    with tempfile.TemporaryDirectory(prefix='motionify-file-backup-') as directory:
        count = copy_files(client('SOURCE'), client('TARGET'), source_bucket, target_bucket,
                           os.environ['FILE_AGE_RECIPIENT'], run_id, Path(directory))
    heartbeat(os.environ['FILE_BACKUP_HEARTBEAT_URL'])
    print(f'Verified encrypted recovery copies for {count} files.')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        print('File backup failed.', file=sys.stderr)
        try:
            heartbeat(os.environ.get('FILE_BACKUP_HEARTBEAT_URL', ''), '/fail')
        except Exception:
            print('Failure notification could not be sent.', file=sys.stderr)
        sys.exit(1)

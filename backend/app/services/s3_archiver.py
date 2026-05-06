import os
import json
from datetime import date
from typing import Any

import boto3

_s3 = None


def _client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client('s3', region_name=os.getenv('AWS_DEFAULT_REGION', 'us-east-1'))
    return _s3


def archive_raw(name: str, payload: Any, run_date: date = None) -> str:
    """
    Upload a JSON-serialisable payload to S3 under raw/{date}/{name}.json.
    Returns the S3 key. Requires S3_BUCKET in .env and valid AWS credentials.
    """
    bucket = os.getenv('S3_BUCKET')
    if not bucket:
        raise RuntimeError('S3_BUCKET is not set in .env')

    if run_date is None:
        run_date = date.today()

    key = f'raw/{run_date.isoformat()}/{name}.json'
    body = json.dumps(payload, default=str).encode('utf-8')

    _client().put_object(
        Bucket=bucket,
        Key=key,
        Body=body,
        ContentType='application/json',
    )
    return f's3://{bucket}/{key}'

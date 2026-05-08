import os
import json
from typing import Any, Optional

import redis

_client: Optional[redis.Redis] = None


def get_client() -> redis.Redis:
    global _client
    if _client is None:
        url = os.getenv('REDIS_URL')
        if not url:
            raise RuntimeError('REDIS_URL not set in .env')
        _client = redis.from_url(url, decode_responses=True)
    return _client


def cache_get(key: str) -> Optional[Any]:
    """Return cached value or None if missing / expired / unavailable."""
    try:
        raw = get_client().get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None   # Degrade gracefully — cache miss on any error


def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    """Store value in cache with TTL in seconds. Failure is non-fatal."""
    try:
        get_client().setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass


def cache_delete(key: str) -> None:
    """Delete a cache key (e.g. after ETL run to bust stale data)."""
    try:
        get_client().delete(key)
    except Exception:
        pass

import time
from collections.abc import Callable
from typing import Any

from fastapi import HTTPException, Request

from database import config as database_config

_LOCAL_BUCKETS: dict[str, tuple[int, float]] = {}

def _client_key(request: Request, bucket: str) -> str:
    # Use the direct peer until a trusted reverse proxy is configured.
    client_host = request.client.host if request.client else "unknown"
    return f"rate-limit:{bucket}:{client_host}"


def _local_allow(key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    now = time.monotonic()
    count, reset_at = _LOCAL_BUCKETS.get(key, (0, now + window_seconds))

    if now >= reset_at:
        count = 0
        reset_at = now + window_seconds

    count += 1
    _LOCAL_BUCKETS[key] = (count, reset_at)

    if len(_LOCAL_BUCKETS) > 10_000:
        expired_keys = [
            bucket_key
            for bucket_key, (_, bucket_reset_at) in _LOCAL_BUCKETS.items()
            if bucket_reset_at <= now
        ]
        for bucket_key in expired_keys:
            _LOCAL_BUCKETS.pop(bucket_key, None)

    return count <= limit, max(1, int(reset_at - now))


def build_rate_limit(bucket: str, limit: int, window_seconds: int) -> Callable[..., Any]:
    async def rate_limit(request: Request) -> None:
        key = _client_key(request, bucket)
        redis = database_config.redis_client
        allowed = True
        retry_after = window_seconds

        if redis:
            try:
                count = await redis.incr(key)
                if count == 1:
                    await redis.expire(key, window_seconds)
                ttl = await redis.ttl(key)
                retry_after = max(1, ttl if ttl >= 0 else window_seconds)
                allowed = count <= limit
            except Exception:
                allowed, retry_after = _local_allow(key, limit, window_seconds)
        else:
            allowed, retry_after = _local_allow(key, limit, window_seconds)

        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="Limite de requisições excedido. Tente novamente mais tarde.",
                headers={"Retry-After": str(retry_after)},
            )

    return rate_limit


search_rate_limit = build_rate_limit("search", limit=5, window_seconds=600)
read_rate_limit = build_rate_limit("read", limit=120, window_seconds=60)
write_rate_limit = build_rate_limit("write", limit=30, window_seconds=60)
message_rate_limit = build_rate_limit("message", limit=30, window_seconds=60)

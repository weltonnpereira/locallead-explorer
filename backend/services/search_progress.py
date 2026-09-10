import asyncio
from typing import Any

_PROGRESS: dict[int, dict[str, Any]] = {}
_SUBSCRIBERS: dict[int, set[asyncio.Queue]] = {}

def _state(search_id: int) -> dict[str, Any]:
    return _PROGRESS.setdefault(
        search_id,
        {"search_id": search_id, "status": "queued", "progress": 0},
    )


async def publish(search_id: int, *, status: str, progress: int, message: str, **extra: Any) -> None:
    event = {
        **_state(search_id),
        "status": status,
        "progress": max(0, min(progress, 100)),
        "message": message,
        **extra,
    }
    _PROGRESS[search_id] = event
    for queue in list(_SUBSCRIBERS.get(search_id, ())):
        await queue.put(event)


async def subscribe(search_id: int) -> asyncio.Queue:
    queue: asyncio.Queue = asyncio.Queue()
    _SUBSCRIBERS.setdefault(search_id, set()).add(queue)
    state = _PROGRESS.get(search_id)
    if state:
        await queue.put(state)
    return queue


def unsubscribe(search_id: int, queue: asyncio.Queue) -> None:
    subscribers = _SUBSCRIBERS.get(search_id)
    if not subscribers:
        return
    subscribers.discard(queue)
    if not subscribers:
        _SUBSCRIBERS.pop(search_id, None)


def get_progress(search_id: int) -> dict[str, Any] | None:
    return _PROGRESS.get(search_id)

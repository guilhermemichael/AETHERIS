import json
from typing import Any
from uuid import UUID

from redis.asyncio import Redis

from app.repositories.protocols import PresenceRepositoryProtocol


class RedisPresenceRepository(PresenceRepositoryProtocol):
    def __init__(
        self,
        redis_client: Redis,
        *,
        presence_ttl_seconds: int,
        heartbeat_ttl_seconds: int,
    ) -> None:
        self.redis_client: Any = redis_client
        self.presence_ttl_seconds = presence_ttl_seconds
        self.heartbeat_ttl_seconds = heartbeat_ttl_seconds

    async def heartbeat(self, session_id: UUID) -> None:
        await self.redis_client.set(
            f"ws:{session_id}:heartbeat",
            "1",
            ex=self.heartbeat_ttl_seconds,
        )

    async def join_room(self, room_id: str, session_id: UUID, payload: dict[str, Any]) -> None:
        await self.redis_client.set(
            _presence_key(room_id, session_id),
            json.dumps(payload),
            ex=self.presence_ttl_seconds,
        )
        await self.redis_client.sadd(_room_key(room_id), str(session_id))
        await self.heartbeat(session_id)

    async def update_presence(self, room_id: str, session_id: UUID, payload: dict[str, Any]) -> None:
        await self.join_room(room_id, session_id, payload)

    async def list_room(self, room_id: str) -> list[dict[str, Any]]:
        members = sorted(await self.redis_client.smembers(_room_key(room_id)))
        if not members:
            return []

        keys = [_presence_key(room_id, UUID(member)) for member in members]
        raw_payloads = await self.redis_client.mget(keys)
        snapshots: list[dict[str, Any]] = []

        for member, raw_payload in zip(members, raw_payloads, strict=False):
            if raw_payload is None:
                await self.redis_client.srem(_room_key(room_id), member)
                continue
            snapshots.append(json.loads(raw_payload))
        return snapshots

    async def remove_session(self, room_id: str, session_id: UUID) -> None:
        await self.redis_client.delete(_presence_key(room_id, session_id))
        await self.redis_client.srem(_room_key(room_id), str(session_id))

    async def clear_session(self, session_id: UUID) -> None:
        async for key in self.redis_client.scan_iter(match=f"presence:*:{session_id}"):
            _, room_id, _ = key.split(":", 2)
            await self.remove_session(room_id, session_id)
        await self.redis_client.delete(f"ws:{session_id}:heartbeat")

    async def ping(self) -> bool:
        await self.redis_client.ping()
        return True


def _presence_key(room_id: str, session_id: UUID) -> str:
    return f"presence:{room_id}:{session_id}"


def _room_key(room_id: str) -> str:
    return f"room:{room_id}:sessions"

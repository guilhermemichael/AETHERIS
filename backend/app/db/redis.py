from redis.asyncio import Redis


class RedisDatabase:
    def __init__(self, redis_url: str) -> None:
        self.client = Redis.from_url(redis_url, decode_responses=True)

    async def ping(self) -> bool:
        await self.client.ping()
        return True

    async def close(self) -> None:
        await self.client.aclose()

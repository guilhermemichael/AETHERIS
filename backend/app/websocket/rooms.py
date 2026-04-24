from uuid import UUID


class RoomRegistry:
    def __init__(self) -> None:
        self._session_rooms: dict[UUID, str] = {}

    def set_room(self, session_id: UUID, room_id: str) -> None:
        self._session_rooms[session_id] = room_id

    def get_room(self, session_id: UUID) -> str | None:
        return self._session_rooms.get(session_id)

    def remove(self, session_id: UUID) -> str | None:
        return self._session_rooms.pop(session_id, None)

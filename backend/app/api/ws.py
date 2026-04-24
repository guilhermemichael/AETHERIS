from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.errors import AuthenticationError
from app.schemas.ws import WSMessage

router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if token is None:
        await websocket.close(code=4401, reason="Missing token")
        return

    token_service = websocket.app.state.token_service
    session_service = websocket.app.state.session_service
    presence_service = websocket.app.state.presence_service
    manager = websocket.app.state.ws_manager
    default_room_id = websocket.app.state.settings.default_room_id

    try:
        session_id, room_id_from_token = token_service.verify_access_token(token)
        session = await session_service.get_session(session_id)
    except AuthenticationError:
        await websocket.close(code=4401, reason="Invalid token")
        return

    await manager.connect(session.session_id, websocket)
    active_room_id = room_id_from_token or default_room_id
    await manager.send(
        websocket,
        "session.accepted",
        {
            "session_id": str(session.session_id),
            "room_id": active_room_id,
        },
    )

    try:
        while True:
            message = WSMessage.model_validate(await websocket.receive_json())
            if message.type == "ping":
                await presence_service.heartbeat(session.session_id)
                await manager.send(websocket, "pong", {"session_id": str(session.session_id)})
                continue

            if message.type == "session.join":
                requested_room_id = message.payload.get("room_id")
                if not isinstance(requested_room_id, str) or not requested_room_id:
                    requested_room_id = default_room_id
                active_room_id = requested_room_id
                manager.join_room(active_room_id, session.session_id, websocket)
                snapshot = {
                    "session_id": str(session.session_id),
                    "room_id": active_room_id,
                    "consent": session.consent.model_dump(),
                    "ts": message.ts,
                }
                await presence_service.join_room(active_room_id, session.session_id, snapshot)
                room_snapshot = await presence_service.list_room(active_room_id)
                await manager.send(
                    websocket,
                    "presence.snapshot",
                    {"room_id": active_room_id, "sessions": room_snapshot},
                )
                await manager.broadcast(
                    active_room_id,
                    "presence.snapshot",
                    {"room_id": active_room_id, "sessions": room_snapshot},
                    exclude_session_id=session.session_id,
                )
                continue

            if message.type == "presence.update":
                payload = {
                    "session_id": str(session.session_id),
                    "room_id": active_room_id,
                    "presence": message.payload,
                    "ts": message.ts,
                }
                await presence_service.update_presence(active_room_id, session.session_id, payload)
                room_snapshot = await presence_service.list_room(active_room_id)
                await manager.broadcast(
                    active_room_id,
                    "presence.snapshot",
                    {"room_id": active_room_id, "sessions": room_snapshot},
                )
                continue

            if message.type == "local.input":
                await manager.broadcast(
                    active_room_id,
                    "world.patch",
                    {
                        "room_id": active_room_id,
                        "session_id": str(session.session_id),
                        "input": message.payload,
                    },
                    exclude_session_id=session.session_id,
                )
                continue

            if message.type == "world.interact":
                await manager.broadcast(
                    active_room_id,
                    "world.patch",
                    {
                        "room_id": active_room_id,
                        "session_id": str(session.session_id),
                        "interaction": message.payload,
                    },
                )
                continue

            await manager.send(
                websocket,
                "error",
                {"detail": f"Unsupported event type: {message.type}"},
            )
    except WebSocketDisconnect:
        disconnected_room_id = await manager.disconnect(session.session_id, websocket)
        if disconnected_room_id is not None:
            await presence_service.remove_session(disconnected_room_id, session.session_id)
            await manager.broadcast(
                disconnected_room_id,
                "presence.left",
                {
                    "room_id": disconnected_room_id,
                    "session_id": str(session.session_id),
                },
            )

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ConsentState, DeviceClass, FeatureFlags, RenderMode
from app.schemas.world import WorldStateSchema


class SessionInitRequest(BaseModel):
    locale: str = Field(min_length=2, max_length=16)
    device_class: DeviceClass
    render_mode: RenderMode
    prefers_reduced_motion: bool = False
    timezone_offset_minutes: int = Field(ge=-840, le=840)


class SessionInitResponse(BaseModel):
    session_id: UUID
    access_token: str
    expires_at: datetime
    consent: ConsentState
    feature_flags: FeatureFlags
    world_state: WorldStateSchema
    room_id: str


class SessionMeResponse(BaseModel):
    session_id: UUID
    expires_at: datetime
    consent: ConsentState
    feature_flags: FeatureFlags
    world_state: WorldStateSchema
    room_id: str


class ConsentUpdateRequest(BaseModel):
    consent: ConsentState


class ConsentUpdateResponse(BaseModel):
    session_id: UUID
    consent: ConsentState
    world_state: WorldStateSchema


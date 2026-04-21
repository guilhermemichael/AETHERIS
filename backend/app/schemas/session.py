from pydantic import BaseModel, Field

from app.schemas.common import ConsentState, DeviceClass, FeatureFlags
from app.schemas.world import WorldStateSchema


class SessionInitRequest(BaseModel):
    locale: str = Field(min_length=2, max_length=10)
    device_class: DeviceClass
    prefers_reduced_motion: bool = False
    wants_audio: bool = True
    wants_biometrics: bool = False


class SessionInitResponse(BaseModel):
    session_id: str
    access_token: str
    seed: str
    room_id: str
    consent_required: list[str]
    world_state: WorldStateSchema
    feature_flags: FeatureFlags


class ConsentUpdateRequest(BaseModel):
    session_id: str
    mic: bool = False
    camera: bool = False
    local_biometrics: bool = False
    presence_sync: bool = True
    audio_reactive: bool = True


class ConsentUpdateResponse(BaseModel):
    session_id: str
    consent: ConsentState
    consent_required: list[str]
    world_state: WorldStateSchema
    feature_flags: FeatureFlags


from typing import Literal

from pydantic import BaseModel, Field


DeviceClass = Literal["desktop", "tablet", "mobile", "unknown"]
RenderMode = Literal["webgpu", "webgl", "static"]


class FeatureFlags(BaseModel):
    webgpu_enabled: bool
    webgl_fallback_enabled: bool
    local_biometrics_enabled: bool
    audio_reactive_enabled: bool
    websocket_enabled: bool
    echoes_enabled: bool = False


class ConsentState(BaseModel):
    microphone: bool = False
    camera: bool = False
    local_biometrics: bool = False
    audio: bool = False
    presence: bool = False


class SeedEntropy(BaseModel):
    session_id: str
    locale: str = Field(min_length=2, max_length=16)
    device_class: DeviceClass
    render_mode: RenderMode
    prefers_reduced_motion: bool = False
    timezone_offset_minutes: int = Field(ge=-840, le=840)
    time_bucket: str


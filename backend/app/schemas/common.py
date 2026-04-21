from typing import Literal

from pydantic import BaseModel, Field


DeviceClass = Literal["desktop", "tablet", "mobile", "unknown"]


class FeatureFlags(BaseModel):
    webgpu_preferred: bool = True
    reactive_audio: bool = True
    brush_reveal: bool = True
    social_presence: bool = False
    temporal_echoes: bool = False


class ConsentState(BaseModel):
    mic: bool = False
    camera: bool = False
    local_biometrics: bool = False
    presence_sync: bool = True
    audio_reactive: bool = True


class SeedEntropy(BaseModel):
    session_id: str
    locale: str = Field(min_length=2, max_length=10)
    device_class: DeviceClass
    prefers_reduced_motion: bool = False
    wants_audio: bool = True
    wants_biometrics: bool = False
    time_bucket: str


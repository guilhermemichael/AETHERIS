from typing import Literal

from pydantic import BaseModel, Field


WorldMode = Literal["void", "bloom", "nebula", "crystal", "archive"]


class WorldStateSchema(BaseModel):
    mode: WorldMode
    seed: str
    entropy: float = Field(ge=0.0, le=1.0)
    fog_density: float = Field(ge=0.0, le=1.0)
    bloom_strength: float = Field(ge=0.0, le=1.0)
    particle_density: float = Field(ge=0.0, le=1.0)
    gravity: float = Field(ge=0.0, le=1.0)
    color_temperature: float = Field(ge=0.0, le=1.0)
    palette: list[str]
    typography_weight: int = Field(ge=100, le=900)
    audio_intensity: float = Field(ge=0.0, le=1.0)


class WorldRecomputeRequest(BaseModel):
    reason: Literal["manual", "presence", "interaction"] = "manual"


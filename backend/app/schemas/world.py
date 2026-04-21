from pydantic import BaseModel, Field


class WorldStateSchema(BaseModel):
    mode: str
    fog_density: float = Field(ge=0.0, le=1.0)
    gravity: float = Field(ge=0.0, le=1.0)
    bloom: float = Field(ge=0.0, le=1.0)
    entropy: float = Field(ge=0.0, le=1.0)
    particle_count: int = Field(ge=0)
    palette: list[str]
    typography_weight: int = Field(ge=100, le=900)
    soundscape: str
    reveal_radius: float = Field(ge=0.0, le=1.0)
    collective_luminosity: float = Field(ge=0.0, le=1.0)


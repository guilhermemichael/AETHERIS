from colorsys import hsv_to_rgb

from app.repositories.protocols import SessionRecord
from app.schemas.common import ConsentState
from app.schemas.world import WorldMode, WorldStateSchema


class WorldEngine:
    def compute(
        self,
        *,
        seed: str,
        session: SessionRecord,
        consent: ConsentState,
        presence_count: int = 1,
    ) -> WorldStateSchema:
        spectrum = self._seed_spectrum(seed)
        performance_scale = self._device_scale(session.device_class)
        motion_scale = 0.68 if session.prefers_reduced_motion else 1.0
        social_glow = min(1.0, max(0.0, (presence_count - 1) * 0.12))
        mode = self._resolve_mode(consent)
        entropy = min(1.0, 0.18 + spectrum[0] * 0.44 + social_glow * 0.2)
        fog_density = min(1.0, 0.24 + (1.0 - motion_scale) * 0.16 + spectrum[1] * 0.46)
        bloom_strength = min(
            1.0,
            0.22
            + spectrum[2] * 0.44
            + (0.14 if consent.microphone else 0.0)
            + (0.08 if consent.camera else 0.0),
        )
        particle_density = min(1.0, 0.35 + performance_scale * 0.28 + spectrum[3] * 0.22)
        gravity = max(0.08, 0.18 + spectrum[4] * 0.56)
        color_temperature = min(1.0, 0.22 + spectrum[5] * 0.58)
        typography_weight = int(200 + round((0.2 + spectrum[6] * 0.65) * 7) * 100)
        audio_intensity = min(1.0, 0.12 + spectrum[7] * 0.28 + (0.28 if consent.audio else 0.0))

        return WorldStateSchema(
            mode=mode,
            seed=seed,
            entropy=round(entropy, 3),
            fog_density=round(fog_density, 3),
            bloom_strength=round(bloom_strength, 3),
            particle_density=round(particle_density, 3),
            gravity=round(gravity, 3),
            color_temperature=round(color_temperature, 3),
            palette=self._build_palette(spectrum),
            typography_weight=typography_weight,
            audio_intensity=round(audio_intensity, 3),
        )

    def _seed_spectrum(self, seed: str) -> list[float]:
        return [int(seed[index : index + 2], 16) / 255 for index in range(0, 16, 2)]

    def _device_scale(self, device_class: str) -> float:
        return {
            "desktop": 1.0,
            "tablet": 0.78,
            "mobile": 0.58,
            "unknown": 0.72,
        }[device_class]

    def _resolve_mode(self, consent: ConsentState) -> WorldMode:
        if consent.local_biometrics and consent.microphone:
            return "bloom"
        if consent.camera:
            return "crystal"
        if consent.audio or consent.microphone:
            return "nebula"
        if consent.presence:
            return "archive"
        return "void"

    def _build_palette(self, spectrum: list[float]) -> list[str]:
        hue_a = 0.52 + spectrum[1] * 0.14
        hue_b = 0.71 + spectrum[2] * 0.12
        hue_c = 0.42 + spectrum[3] * 0.1
        return [
            "#000000",
            self._hsv_hex(0.58, 0.18, 0.08),
            self._hsv_hex(hue_a % 1.0, 0.56, 0.97),
            self._hsv_hex(hue_b % 1.0, 0.54, 0.86),
            self._hsv_hex(hue_c % 1.0, 0.48, 0.82),
        ]

    def _hsv_hex(self, hue: float, saturation: float, value: float) -> str:
        red, green, blue = hsv_to_rgb(hue, saturation, value)
        return "#{:02X}{:02X}{:02X}".format(int(red * 255), int(green * 255), int(blue * 255))


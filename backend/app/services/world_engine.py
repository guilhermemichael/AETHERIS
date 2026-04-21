from colorsys import hsv_to_rgb

from app.core.constants import WORLD_MODE_BLOOM, WORLD_MODE_RITUAL
from app.schemas.common import ConsentState
from app.schemas.session import SessionInitRequest
from app.schemas.world import WorldStateSchema


class WorldEngine:
    def compute(
        self,
        *,
        seed: str,
        request: SessionInitRequest,
        consent: ConsentState,
    ) -> WorldStateSchema:
        spectrum = self._seed_spectrum(seed)
        performance_scale = self._device_scale(request.device_class)
        motion_scale = 0.62 if request.prefers_reduced_motion else 1.0
        biometrics_enabled = request.wants_biometrics and consent.local_biometrics and consent.mic
        audio_enabled = request.wants_audio and consent.audio_reactive

        mode = WORLD_MODE_BLOOM if biometrics_enabled else WORLD_MODE_RITUAL
        particle_budget = int(2200 * performance_scale * motion_scale * (0.8 + spectrum[0] * 0.4))

        fog_density = min(1.0, 0.28 + (1.0 - motion_scale) * 0.18 + spectrum[1] * 0.45)
        gravity = max(0.12, 0.25 + spectrum[2] * 0.55)
        bloom = min(1.0, 0.24 + spectrum[3] * 0.5 + (0.1 if biometrics_enabled else 0.0))
        entropy = min(1.0, 0.2 + spectrum[4] * 0.55 + (0.08 if consent.presence_sync else 0.0))
        typography_weight = int(300 + round(spectrum[5] * 400 / 100) * 100)
        reveal_radius = min(1.0, 0.22 + spectrum[6] * 0.4 + (0.1 if consent.mic else 0.0))
        collective_luminosity = min(1.0, 0.15 + spectrum[7] * 0.45)

        return WorldStateSchema(
            mode=mode,
            fog_density=round(fog_density, 3),
            gravity=round(gravity, 3),
            bloom=round(bloom, 3),
            entropy=round(entropy, 3),
            particle_count=particle_budget,
            palette=self._build_palette(spectrum),
            typography_weight=typography_weight,
            soundscape="resonant_veil" if audio_enabled else "silent_depth",
            reveal_radius=round(reveal_radius, 3),
            collective_luminosity=round(collective_luminosity, 3),
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

    def _build_palette(self, spectrum: list[float]) -> list[str]:
        hue_a = 0.5 + spectrum[1] * 0.2
        hue_b = 0.72 + spectrum[2] * 0.16
        hue_c = 0.38 + spectrum[3] * 0.18
        return [
            "#05070B",
            self._hsv_hex(hue_a % 1.0, 0.58, 0.96),
            self._hsv_hex(hue_b % 1.0, 0.52, 0.88),
            self._hsv_hex(hue_c % 1.0, 0.45, 0.82),
        ]

    def _hsv_hex(self, hue: float, saturation: float, value: float) -> str:
        red, green, blue = hsv_to_rgb(hue, saturation, value)
        return "#{:02X}{:02X}{:02X}".format(int(red * 255), int(green * 255), int(blue * 255))


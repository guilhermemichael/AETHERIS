from app.schemas.common import ConsentState


class ConsentService:
    def normalize(self, consent: ConsentState) -> ConsentState:
        return ConsentState(
            microphone=consent.microphone,
            camera=consent.camera,
            local_biometrics=consent.local_biometrics and consent.microphone,
            audio=consent.audio,
            presence=consent.presence,
        )

from app.schemas.common import SeedEntropy
from app.services.seed_service import SeedService


def test_seed_generation_is_deterministic() -> None:
    entropy = SeedEntropy(
        session_id="sess_fixed",
        locale="en-US",
        device_class="desktop",
        prefers_reduced_motion=False,
        wants_audio=True,
        wants_biometrics=False,
        time_bucket="2026-04-21T13",
    )
    service = SeedService()

    seed_a = service.create_seed(entropy)
    seed_b = service.create_seed(entropy)

    assert seed_a == seed_b
    assert len(seed_a) == 64


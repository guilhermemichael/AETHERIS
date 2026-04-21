import hashlib
import json

from app.schemas.common import SeedEntropy


class SeedService:
    def create_seed(self, entropy: SeedEntropy) -> str:
        payload = json.dumps(entropy.model_dump(), sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()


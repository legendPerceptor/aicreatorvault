import os
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv

# Load from project root .env (two levels up from this file)
_ENV_FILE = Path(__file__).parent.parent / ".env"
load_dotenv(_ENV_FILE)


class Settings:
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    openai_embedding_model: str = os.environ.get(
        "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
    )
    openai_vision_model: str = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o-mini")
    service_port: int = int(os.environ.get("SERVICE_PORT", "8001"))
    node_backend_url: str = os.environ.get("NODE_BACKEND_URL", "http://localhost:3001")


@lru_cache()
def get_settings() -> Settings:
    return Settings()

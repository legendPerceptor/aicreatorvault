import logging
import os

from config import get_settings

logger = logging.getLogger(__name__)

_lightrag_instance = None


def _ensure_qdrant_url():
    """Set QDRANT_URL env var from QDRANT_HOST/QDRANT_PORT if not already set.

    LightRAG's QdrantVectorDBStorage reads QDRANT_URL from the environment.
    """
    if not os.environ.get("QDRANT_URL"):
        settings = get_settings()
        os.environ["QDRANT_URL"] = f"http://{settings.qdrant_host}:{settings.qdrant_port}"


async def initialize_lightrag():
    """Initialize the LightRAG singleton with Qdrant vector backend."""
    global _lightrag_instance

    _ensure_qdrant_url()
    settings = get_settings()
    working_dir = settings.lightrag_working_dir
    os.makedirs(working_dir, exist_ok=True)

    from lightrag import LightRAG
    from lightrag.llm.openai import gpt_4o_mini_complete, openai_embed

    rag = LightRAG(
        working_dir=working_dir,
        embedding_func=openai_embed,
        llm_model_func=gpt_4o_mini_complete,
        vector_storage="QdrantVectorDBStorage",
        graph_storage="NetworkXStorage",
        kv_storage="JsonKVStorage",
        doc_status_storage="JsonDocStatusStorage",
        vector_db_storage_cls_kwargs={
            "cosine_better_than_threshold": 0.2,
        },
        addon_params={
            "language": "English",
            "entity_types": [
                "art_style",
                "technique",
                "subject",
                "mood",
                "color_palette",
                "composition",
                "artist",
                "medium",
                "genre",
                "theme",
            ],
        },
    )

    await rag.initialize_storages()
    _lightrag_instance = rag
    logger.info("LightRAG initialized (working_dir=%s)", working_dir)


async def finalize_lightrag():
    """Flush and release LightRAG storage backends."""
    global _lightrag_instance
    if _lightrag_instance is not None:
        await _lightrag_instance.finalize_storages()
        _lightrag_instance = None
        logger.info("LightRAG finalized")


def get_lightrag():
    """Return the initialized LightRAG singleton.

    Raises RuntimeError if LightRAG has not been initialized.
    """
    if _lightrag_instance is None:
        raise RuntimeError("LightRAG not initialized")
    return _lightrag_instance


def is_lightrag_ready() -> bool:
    return _lightrag_instance is not None

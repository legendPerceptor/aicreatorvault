import logging
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import get_settings
from image_processor import BatchImageProcessor, ImageProcessor, SemanticSearch
from lightrag_manager import (
    finalize_lightrag,
    get_lightrag,
    initialize_lightrag,
    is_lightrag_ready,
)
from qdrant_utils import get_qdrant_manager

settings = get_settings()
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan: initialise / teardown LightRAG alongside the FastAPI app
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await initialize_lightrag()
    except Exception:
        logger.exception("LightRAG initialization failed – endpoints will be unavailable")
    yield
    await finalize_lightrag()


app = FastAPI(
    title="AIGC Image Analysis Service",
    description="基于 Daft + OpenAI 的多模态图像分析服务 (with LightRAG)",
    version="1.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Existing Pydantic models
# ---------------------------------------------------------------------------


class AnalyzeRequest(BaseModel):
    image_path: str


class AnalyzeResponse(BaseModel):
    description: str
    embedding: list[float]
    model: str


class SearchRequest(BaseModel):
    query: str
    images: list[dict]
    top_k: int = 10


class SearchResponse(BaseModel):
    results: list[dict]


class BatchRequest(BaseModel):
    directory_path: str
    extensions: Optional[list[str]] = None


class BatchPathsRequest(BaseModel):
    image_paths: list[str]


class BatchResponse(BaseModel):
    results: list[dict]


# ---------------------------------------------------------------------------
# LightRAG Pydantic models
# ---------------------------------------------------------------------------


class LightRAGIndexRequest(BaseModel):
    content: str
    asset_id: str
    asset_type: str  # "prompt" | "image"
    metadata: Optional[dict] = None


class LightRAGQueryRequest(BaseModel):
    query: str
    mode: str = "hybrid"  # local | global | hybrid | mix | naive
    only_need_context: bool = False  # True → structured data only, no LLM answer


class LightRAGBatchIndexItem(BaseModel):
    content: str
    asset_id: str
    asset_type: str
    metadata: Optional[dict] = None


class LightRAGBatchIndexRequest(BaseModel):
    items: list[LightRAGBatchIndexItem]


# ---------------------------------------------------------------------------
# Root / health
# ---------------------------------------------------------------------------


@app.get("/")
async def root():
    return {
        "service": "AIGC Image Analysis Service",
        "version": "1.1.0",
        "status": "running",
        "lightrag": is_lightrag_ready(),
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Image analysis endpoints (unchanged)
# ---------------------------------------------------------------------------


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_image(request: AnalyzeRequest):
    if not os.path.exists(request.image_path):
        raise HTTPException(status_code=404, detail="Image file not found")

    try:
        processor = ImageProcessor()
        result = processor.process_single_image(request.image_path)
        return AnalyzeResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/upload", response_model=AnalyzeResponse)
async def analyze_uploaded_image(file: UploadFile = File(...)):
    tmp_path = None
    try:
        suffix = Path(file.filename).suffix if file.filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        processor = ImageProcessor()
        result = processor.process_single_image(tmp_path)

        os.unlink(tmp_path)
        return AnalyzeResponse(**result)
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/text", response_model=SearchResponse)
async def search_by_text(request: SearchRequest):
    try:
        searcher = SemanticSearch()
        results = searcher.search_by_text(request.query, request.images, request.top_k)
        return SearchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/image", response_model=SearchResponse)
async def search_by_image(
    file: UploadFile = File(...), images: str = Form(...), top_k: int = Form(10)
):
    import json

    tmp_path = None
    try:
        suffix = Path(file.filename).suffix if file.filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        images_list = json.loads(images)
        searcher = SemanticSearch()
        results = searcher.search_by_image(tmp_path, images_list, top_k)

        os.unlink(tmp_path)
        return SearchResponse(results=results)
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch", response_model=BatchResponse)
async def batch_process(request: BatchRequest):
    if not os.path.exists(request.directory_path):
        raise HTTPException(status_code=404, detail="Directory not found")

    try:
        processor = BatchImageProcessor()
        results = processor.process_directory(
            request.directory_path, request.extensions or []
        )
        return BatchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-paths", response_model=BatchResponse)
async def batch_process_paths(request: BatchPathsRequest):
    try:
        processor = BatchImageProcessor()
        results = processor.process_paths(request.image_paths)
        return BatchResponse(results=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embedding")
async def generate_embedding(text: str):
    try:
        processor = ImageProcessor()
        embedding = processor.generate_embedding(text)
        return {"embedding": embedding, "model": settings.openai_embedding_model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= Qdrant 向量搜索 API =============


class QdrantUpsertRequest(BaseModel):
    image_id: int
    embedding: list[float]
    metadata: Optional[dict] = None


class QdrantSearchRequest(BaseModel):
    query_vector: list[float]
    top_k: int = 20
    filters: Optional[dict] = None


class QdrantBatchUpsertRequest(BaseModel):
    points: list[dict]  # [{id, embedding, metadata}]


class QdrantBatchDeleteRequest(BaseModel):
    image_ids: list[int]


@app.get("/qdrant/health")
async def qdrant_health_check():
    """检查 Qdrant 连接状态"""
    try:
        qdrant = get_qdrant_manager()
        is_healthy = qdrant.health_check()

        if is_healthy:
            info = qdrant.get_collection_info()
            return {"status": "healthy", "connected": True, "collection": info}
        else:
            return {
                "status": "unhealthy",
                "connected": False,
                "error": "无法连接到 Qdrant",
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/init")
async def qdrant_init_collection():
    """初始化 Qdrant 集合"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.init_collection()

        if success:
            return {"status": "success", "message": "集合初始化完成"}
        else:
            raise HTTPException(status_code=500, detail="集合初始化失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/upsert")
async def qdrant_upsert_vector(request: QdrantUpsertRequest):
    """插入或更新单个图片向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.upsert_image(
            image_id=request.image_id,
            embedding=request.embedding,
            metadata=request.metadata,
        )

        if success:
            return {"status": "success", "image_id": request.image_id}
        else:
            raise HTTPException(status_code=500, detail="向量插入失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/batch-upsert")
async def qdrant_batch_upsert(request: QdrantBatchUpsertRequest):
    """批量插入向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.batch_upsert(request.points)

        if success:
            return {"status": "success", "count": len(request.points)}
        else:
            raise HTTPException(status_code=500, detail="批量插入失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/search")
async def qdrant_search_vectors(request: QdrantSearchRequest):
    """使用 Qdrant 进行向量搜索"""
    try:
        qdrant = get_qdrant_manager()
        results = qdrant.search(
            query_vector=request.query_vector,
            top_k=request.top_k,
            filters=request.filters,
        )

        return {"status": "success", "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/qdrant/delete/{image_id}")
async def qdrant_delete_vector(image_id: int):
    """删除单个图片向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.delete_image(image_id)

        if success:
            return {"status": "success", "image_id": image_id}
        else:
            raise HTTPException(status_code=500, detail="向量删除失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/qdrant/batch-delete")
async def qdrant_batch_delete(request: QdrantBatchDeleteRequest):
    """批量删除向量"""
    try:
        qdrant = get_qdrant_manager()
        success = qdrant.batch_delete(request.image_ids)

        if success:
            return {"status": "success", "count": len(request.image_ids)}
        else:
            raise HTTPException(status_code=500, detail="批量删除失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/qdrant/info")
async def qdrant_get_info():
    """获取 Qdrant 集合信息"""
    try:
        qdrant = get_qdrant_manager()
        info = qdrant.get_collection_info()

        if info:
            return {"status": "success", "info": info}
        else:
            raise HTTPException(status_code=500, detail="获取集合信息失败")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============= LightRAG Knowledge Graph API =============


def _build_index_content(
    asset_type: str,
    content: str,
    metadata: Optional[dict] = None,
) -> str:
    """Build rich text for LightRAG indexing from asset data."""
    parts: list[str] = []

    if asset_type == "prompt":
        parts.append(f"[PROMPT] {content}")
    elif asset_type == "image":
        parts.append("[IMAGE]")
        parts.append(f"Description: {content}")
    else:
        parts.append(content)

    if metadata:
        if metadata.get("prompt"):
            parts.append(f"Generated with prompt: {metadata['prompt']}")
        if metadata.get("score") is not None:
            parts.append(f"Rating: {metadata['score']}/10")
        if metadata.get("tags"):
            parts.append(f"Tags: {', '.join(metadata['tags'])}")

    return "\n".join(parts)


@app.get("/lightrag/status")
async def lightrag_status():
    """Check LightRAG initialization status."""
    return {
        "initialized": is_lightrag_ready(),
        "working_dir": settings.lightrag_working_dir,
        "vector_storage": "QdrantVectorDBStorage" if is_lightrag_ready() else None,
        "graph_storage": "NetworkXStorage" if is_lightrag_ready() else None,
    }


@app.post("/lightrag/index")
async def lightrag_index(request: LightRAGIndexRequest):
    """Index asset content into the LightRAG knowledge graph."""
    if not is_lightrag_ready():
        raise HTTPException(status_code=503, detail="LightRAG not initialized")

    try:
        rag = get_lightrag()
        text = _build_index_content(request.asset_type, request.content, request.metadata)
        file_path = f"asset://{request.asset_id}"

        track_id = await rag.ainsert(text, file_paths=file_path)

        return {
            "status": "success",
            "asset_id": request.asset_id,
            "track_id": track_id,
        }
    except Exception as e:
        logger.exception("LightRAG indexing failed for asset %s", request.asset_id)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/lightrag/batch-index")
async def lightrag_batch_index(request: LightRAGBatchIndexRequest):
    """Batch-index multiple assets into LightRAG."""
    if not is_lightrag_ready():
        raise HTTPException(status_code=503, detail="LightRAG not initialized")

    results: list[dict] = []
    rag = get_lightrag()

    for item in request.items:
        try:
            text = _build_index_content(item.asset_type, item.content, item.metadata)
            file_path = f"asset://{item.asset_id}"
            track_id = await rag.ainsert(text, file_paths=file_path)
            results.append({"asset_id": item.asset_id, "status": "success", "track_id": track_id})
        except Exception as e:
            logger.exception("Batch-index failed for asset %s", item.asset_id)
            results.append({"asset_id": item.asset_id, "status": "failed", "error": str(e)})

    succeeded = sum(1 for r in results if r["status"] == "success")
    return {
        "status": "completed",
        "total": len(request.items),
        "succeeded": succeeded,
        "failed": len(request.items) - succeeded,
        "results": results,
    }


@app.post("/lightrag/query")
async def lightrag_query(request: LightRAGQueryRequest):
    """Smart search via LightRAG knowledge graph."""
    if not is_lightrag_ready():
        raise HTTPException(status_code=503, detail="LightRAG not initialized")

    try:
        from lightrag import QueryParam

        rag = get_lightrag()
        param = QueryParam(mode=request.mode)

        if request.only_need_context:
            result = await rag.aquery_data(request.query, param=param)
            return {"status": "success", "mode": request.mode, "data": result}
        else:
            result = await rag.aquery(request.query, param=param)
            return {"status": "success", "mode": request.mode, "response": result}

    except Exception as e:
        logger.exception("LightRAG query failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/lightrag/index/{doc_id}")
async def lightrag_delete(doc_id: str):
    """Remove an indexed document from the LightRAG knowledge graph."""
    if not is_lightrag_ready():
        raise HTTPException(status_code=503, detail="LightRAG not initialized")

    try:
        rag = get_lightrag()
        await rag.adelete_by_doc_id(doc_id)
        return {"status": "success", "doc_id": doc_id}
    except Exception as e:
        logger.exception("LightRAG delete failed for doc %s", doc_id)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------


def run_server():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=settings.service_port)


if __name__ == "__main__":
    run_server()

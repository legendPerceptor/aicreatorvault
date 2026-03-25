"""
Qdrant 向量数据库客户端
用于管理图像向量索引和语义搜索
"""

from qdrant_client import QdrantClient as QdrantClientSDK
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    Range,
)
from typing import Optional, Dict, List, Any
import logging
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class QdrantManager:
    """Qdrant 向量数据库管理器"""

    def __init__(self, host: Optional[str] = None, port: Optional[int] = None):
        """
        初始化 Qdrant 客户端

        Args:
            host: Qdrant 服务器地址，默认从环境变量读取
            port: Qdrant 端口，默认从环境变量读取
        """
        self.host = host or settings.qdrant_host
        self.port = port or settings.qdrant_port
        self.collection_name = "images"

        # 初始化客户端
        self.client = QdrantClientSDK(
            host=self.host,
            port=self.port,
        )

        logger.info(f"Qdrant 客户端初始化完成: {self.host}:{self.port}")

    def init_collection(self, vector_size: int = 1536) -> bool:
        """
        初始化图像向量集合

        Args:
            vector_size: 向量维度，默认 1536 (OpenAI text-embedding-3-small)

        Returns:
            bool: 是否成功创建
        """
        try:
            # 检查集合是否已存在
            if self.client.collection_exists(self.collection_name):
                logger.info(f"集合 '{self.collection_name}' 已存在")
                return True

            # 创建新集合
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=Distance.COSINE,  # 使用余弦相似度
                ),
            )

            logger.info(f"成功创建集合 '{self.collection_name}' (维度: {vector_size})")
            return True

        except Exception as e:
            logger.error(f"初始化集合失败: {e}")
            return False

    def upsert_image(
        self,
        image_id: int,
        embedding: List[float],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        插入或更新图片向量

        Args:
            image_id: 图片 ID
            embedding: 1536 维向量
            metadata: 元数据（filename, description, score, created_at 等）

        Returns:
            bool: 是否成功
        """
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    PointStruct(id=image_id, vector=embedding, payload=metadata or {})
                ],
            )

            logger.debug(f"成功插入/更新图片向量: ID={image_id}")
            return True

        except Exception as e:
            logger.error(f"插入/更新图片向量失败: {e}")
            return False

    def batch_upsert(self, points: List[Dict[str, Any]], batch_size: int = 100) -> bool:
        """
        批量插入/更新向量

        Args:
            points: 点列表，每个包含 {id, embedding, metadata}
            batch_size: 批次大小

        Returns:
            bool: 是否全部成功
        """
        try:
            total = len(points)
            success_count = 0

            for i in range(0, total, batch_size):
                batch = points[i : i + batch_size]

                qdrant_points = [
                    PointStruct(
                        id=p["id"], vector=p["embedding"], payload=p.get("metadata", {})
                    )
                    for p in batch
                ]

                self.client.upsert(
                    collection_name=self.collection_name, points=qdrant_points
                )

                success_count += len(batch)
                logger.info(f"批量插入进度: {success_count}/{total}")

            logger.info(f"批量插入完成: {success_count}/{total}")
            return success_count == total

        except Exception as e:
            logger.error(f"批量插入失败: {e}")
            return False

    def search(
        self,
        query_vector: List[float],
        top_k: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        搜索相似图片

        Args:
            query_vector: 查询向量
            top_k: 返回结果数量
            filters: 过滤条件（例如：评分范围、日期范围）

        Returns:
            List[Dict]: 搜索结果列表
        """
        try:
            # 构建过滤条件
            query_filter = None
            if filters:
                conditions = []

                # 评分过滤
                if "min_score" in filters or "max_score" in filters:
                    score_range = {}
                    if "min_score" in filters:
                        score_range["gte"] = filters["min_score"]
                    if "max_score" in filters:
                        score_range["lte"] = filters["max_score"]

                    conditions.append(
                        FieldCondition(key="score", range=Range(**score_range))
                    )

                if conditions:
                    query_filter = Filter(must=conditions)

            # 执行搜索
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=top_k,
            )

            # 格式化结果
            formatted_results = [
                {
                    "id": hit.id,
                    "score": hit.score,  # 相似度得分
                    "metadata": hit.payload,
                }
                for hit in results
            ]

            logger.debug(f"搜索完成，返回 {len(formatted_results)} 个结果")
            return formatted_results

        except Exception as e:
            logger.error(f"搜索失败: {e}")
            return []

    def delete_image(self, image_id: int) -> bool:
        """
        删除图片向量

        Args:
            image_id: 图片 ID

        Returns:
            bool: 是否成功
        """
        try:
            self.client.delete(
                collection_name=self.collection_name, points_selector=[image_id]
            )

            logger.debug(f"成功删除图片向量: ID={image_id}")
            return True

        except Exception as e:
            logger.error(f"删除图片向量失败: {e}")
            return False

    def batch_delete(self, image_ids: List[int]) -> bool:
        """
        批量删除向量

        Args:
            image_ids: 图片 ID 列表

        Returns:
            bool: 是否成功
        """
        try:
            self.client.delete(
                collection_name=self.collection_name, points_selector=image_ids
            )

            logger.info(f"成功批量删除 {len(image_ids)} 个向量")
            return True

        except Exception as e:
            logger.error(f"批量删除失败: {e}")
            return False

    def get_collection_info(self) -> Optional[Dict[str, Any]]:
        """
        获取集合信息

        Returns:
            Dict: 集合信息（向量数量、索引状态等）
        """
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "points_count": info.points_count,
                "vectors_count": info.vectors_count,
                "status": info.status.value,
                "config": {
                    "vector_size": info.config.params.vectors.size,
                    "distance": info.config.params.vectors.distance.value,
                },
            }
        except Exception as e:
            logger.error(f"获取集合信息失败: {e}")
            return None

    def health_check(self) -> bool:
        """
        健康检查

        Returns:
            bool: Qdrant 是否可用
        """
        try:
            # 尝试获取集合列表
            self.client.get_collections()
            return True
        except Exception as e:
            logger.error(f"Qdrant 健康检查失败: {e}")
            return False


# 单例实例
_qdrant_manager: Optional[QdrantManager] = None


def get_qdrant_manager() -> QdrantManager:
    """获取 Qdrant 管理器单例"""
    global _qdrant_manager

    if _qdrant_manager is None:
        _qdrant_manager = QdrantManager()
        _qdrant_manager.init_collection()

    return _qdrant_manager

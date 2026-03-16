# AI 智能检索模块改进方案 v2

**更新日期：** 2026-03-16
**状态：** 分析完成，等待实施

---

## 📊 现有实现评估

### ✅ 已实现功能

**后端（retrievalService.js）：**
- 混合检索（关键词 + 语义）✓
- RRF 融合算法 ✓
- 重排序（相似度 + 评分 + 日期）✓
- 匹配原因生成 ✓
- 查询扩展/优化 ✓
- 过滤器（评分/相似度/日期）✓

**前端（SearchPage.jsx）：**
- 智能搜索框（自动检测意图）✓
- 多模式搜索（关键词/语义/混合/以图搜图）✓
- 搜索过滤器 ✓
- 结果工具栏 ✓
- 相似度雷达图 ✓

### ❌ 核心问题

| 问题 | 严重程度 | 说明 |
|------|---------|------|
| 向量搜索性能 | 🔴 严重 | SQLite 模式全量加载到内存，O(n) 复杂度 |
| 无向量索引 | 🟡 中等 | pgvector 没有 HNSW/IVF 索引 |
| 无缓存机制 | 🟢 低 | 重复查询浪费 API 调用（单用户影响小） |

---

## 🔍 问题详解：为什么需要 Qdrant？

### 当前 SQLite 模式的性能问题

```javascript
// backend/services/retrievalService.js - semanticSearch()
const images = await Image.findAll({ include: Prompt });  // 加载所有图片！
const imagesWithEmbeddings = images.filter(img => img.embedding);  // 过滤有 embedding 的
// ... 然后在内存中计算余弦相似度
```

**问题分析：**

| 图片数量 | Embedding 大小 | 内存占用 | 计算时间 |
|---------|---------------|---------|---------|
| 100 张 | 1536 维 × 4 字节 | ~0.6 MB | ~50ms |
| 1,000 张 | 1536 维 × 4 字节 | ~6 MB | ~500ms |
| 10,000 张 | 1536 维 × 4 字节 | ~60 MB | ~5s |
| 100,000 张 | 1536 维 × 4 字节 | ~600 MB | ~50s ❌ |

**结论：** 1000 张图以上，SQLite 模式不可用。

### Qdrant 的优势

```
SQLite (暴力搜索):  O(n)  - 随数据量线性增长
Qdrant (ANN 索引):  O(log n) - 几乎不受数据量影响
```

| 图片数量 | SQLite | Qdrant |
|---------|--------|--------|
| 1,000 张 | 500ms | 10ms |
| 10,000 张 | 5s | 15ms |
| 100,000 张 | 50s | 20ms |
| 1,000,000 张 | 💀 | 30ms |

---

## 📝 组件优先级分析

### Qdrant - 🔴 必须引入

**为什么必须：**
1. 当前架构无法支撑 1000+ 图片
2. ANN 索引是唯一可行的方案
3. 还支持元数据过滤（按评分、日期筛选）

**收益：**
- 搜索延迟：秒级 → 毫秒级
- 支持百万级图像
- 支持复杂过滤查询

### Redis - 🟢 可选（暂不实施）

**Redis 能带来什么：**

| 场景 | 没有 Redis | 有 Redis |
|------|-----------|----------|
| 重复搜索 | 每次调 OpenAI API (1-2s) | 命中缓存 (50ms) |
| 热门查询 | 100 次 = 100 次 API | 100 次 = 1 次 API + 99 次缓存 |
| API 成本 | 每次都花钱 | 重复查询不花钱 |

**但是否需要取决于：**

| 因素 | 需要缓存 | 不需要缓存 |
|------|---------|-----------|
| 用户量 | 多用户 | 单用户 |
| 查询重复率 | 经常搜相同内容 | 每次搜索不同 |
| 延迟敏感度 | 要求 <100ms | 1-2s 可接受 |

**结论：** 单用户/低查询重复场景，Redis 不是必须的。可以先不实施，后续有需要再加。

### PostgreSQL + pgvector - 🟡 可选

**当前状态：** 项目已支持 pgvector，但用的是 SQLite

**pgvector 的优势：**
- 原生 SQL 查询
- 支持 HNSW/IVFFlat 索引
- 单一数据库（不需要 Qdrant）

**但是：**
- pgvector 索引性能不如专用向量数据库
- 需要额外部署 PostgreSQL

**建议：** 如果坚持用关系数据库，可以：
1. 用 PostgreSQL + pgvector + HNSW 索引
2. 不引入 Qdrant

---

## 🚀 实施建议

### 方案 A：Qdrant（推荐）

**适合：** 需要最佳性能，不介意多一个服务

```
架构：Backend → Qdrant (向量搜索)
      Backend → SQLite/PostgreSQL (元数据)
```

**优点：**
- 最佳性能
- 支持复杂过滤
- 专用工具做专用事

### 方案 B：PostgreSQL + pgvector

**适合：** 希望架构简单，不想多一个服务

```
架构：Backend → PostgreSQL + pgvector (向量 + 元数据)
```

**优点：**
- 单一数据库
- SQL 熟悉
- 少一个容器

**需要添加索引：**
```sql
CREATE INDEX ON "Images" USING hnsw (embedding_vector vector_cosine_ops);
```

---

## 📈 实施路线图

### Phase 1：Qdrant 集成（优先）

**目标：** 解决向量搜索性能问题

**需要修改的文件：**
1. `image-service/qdrant_client.py` (新增) - Qdrant 客户端
2. `image-service/main.py` (修改) - 集成 Qdrant
3. `backend/services/retrievalService.js` (修改) - 调用 Qdrant API

**代码示例：**

```python
# image-service/qdrant_client.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

class QdrantManager:
    def __init__(self, host="localhost", port=6333):
        self.client = QdrantClient(host=host, port=port)
        self.collection_name = "images"

    def init_collection(self):
        """初始化集合"""
        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=1536, distance=Distance.Cosine)
            )

    def upsert_image(self, image_id: int, embedding: list, metadata: dict):
        """插入/更新图片向量"""
        self.client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(
                id=image_id,
                vector=embedding,
                payload=metadata  # {filename, description, score, created_at}
            )]
        )

    def search(self, query_vector: list, top_k: int = 20, filters: dict = None):
        """搜索相似图片"""
        return self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=filters,  # 支持按评分、日期过滤
            limit=top_k
        )

    def delete_image(self, image_id: int):
        """删除图片向量"""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=[image_id]
        )
```

**迁移脚本：** 将现有 embedding 迁移到 Qdrant

```python
# scripts/migrate_to_qdrant.py
import asyncio
from qdrant_client import QdrantManager
# 从数据库加载所有图片的 embedding，批量写入 Qdrant
```

### Phase 2：Redis 缓存（可选）

**触发条件：** 多用户使用 / 高查询重复率

**需要修改的文件：**
1. `backend/utils/cache.js` (新增)
2. `backend/services/retrievalService.js` (修改)

```javascript
// backend/utils/cache.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const crypto = require('crypto');

function getCacheKey(query, filters) {
  return `search:${crypto.createHash('md5')
    .update(JSON.stringify({query, filters}))
    .digest('hex')}`;
}

async function getCachedSearch(query, filters) {
  const cached = await redis.get(getCacheKey(query, filters));
  return cached ? JSON.parse(cached) : null;
}

async function setCacheSearch(query, filters, results, ttl = 3600) {
  await redis.setex(getCacheKey(query, filters), ttl, JSON.stringify(results));
}

module.exports = { getCachedSearch, setCacheSearch };
```

---

## 🐳 Docker 部署配置

已在 `docker-compose.yml` 中配置好 Qdrant 和 Redis（可选）。

**启动：**
```bash
docker-compose up -d qdrant  # 只启动 Qdrant
docker-compose up -d         # 启动全部（包括 Redis）
```

---

## 📋 总结

| 组件 | 优先级 | 状态 | 备注 |
|------|--------|------|------|
| Qdrant | 🔴 必须 | ⏳ 待实施 | 解决核心性能问题 |
| Redis | 🟢 可选 | ⏸️ 暂缓 | 单用户场景不需要 |
| PostgreSQL | 🟡 可选 | ✅ 已支持 | 可替代 Qdrant |

**下一步：** 实施 Phase 1 - Qdrant 集成

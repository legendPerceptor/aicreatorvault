# AI Intelligent Retrieval Module Improvement Plan v2

> [中文版](../zh/AI_SEARCH_IMPROVEMENT.md)


**Updated:** 2026-03-16
**Status:** Analysis complete, awaiting implementation

---

## 📊 Current Implementation Assessment

### ✅ Implemented Features

**Backend (retrievalService.js):**
- Hybrid retrieval (keyword + semantic) ✓
- RRF fusion algorithm ✓
- Re-ranking (similarity + score + date) ✓
- Match reason generation ✓
- Query expansion/optimization ✓
- Filters (score/similarity/date) ✓

**Frontend (SearchPage.jsx):**
- Smart search box (auto-detect intent) ✓
- Multi-mode search (keyword/semantic/hybrid/image-to-image) ✓
- Search filters ✓
- Results toolbar ✓
- Similarity radar chart ✓

### ❌ Core Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Vector search performance | 🔴 Critical | SQLite mode loads everything into memory, O(n) complexity |
| No vector index | 🟡 Medium | pgvector has no HNSW/IVF index |
| No caching mechanism | 🟢 Low | Repeated queries waste API calls (minor impact for single user) |

---

## 🔍 Detailed Analysis: Why Qdrant?

### Current SQLite Mode Performance Issues

```javascript
// backend/services/retrievalService.js - semanticSearch()
const images = await Image.findAll({ include: Prompt });  // Loads ALL images!
const imagesWithEmbeddings = images.filter(img => img.embedding);  // Filter those with embeddings
// ... then compute cosine similarity in memory
```

**Problem Analysis:**

| Number of Images | Embedding Size | Memory Usage | Computation Time |
|-----------------|----------------|--------------|------------------|
| 100             | 1536 dims × 4 bytes | ~0.6 MB | ~50ms |
| 1,000           | 1536 dims × 4 bytes | ~6 MB   | ~500ms |
| 10,000          | 1536 dims × 4 bytes | ~60 MB  | ~5s |
| 100,000         | 1536 dims × 4 bytes | ~600 MB | ~50s ❌ |

**Conclusion:** With more than 1,000 images, SQLite mode is unusable.

### Qdrant Advantages

```
SQLite (brute-force search): O(n)  - Linear growth with data size
Qdrant (ANN index):          O(log n) - Nearly unaffected by data size
```

| Number of Images | SQLite | Qdrant |
|-----------------|--------|--------|
| 1,000           | 500ms  | 10ms   |
| 10,000          | 5s     | 15ms   |
| 100,000         | 50s    | 20ms   |
| 1,000,000       | 💀     | 30ms   |

---

## 📝 Component Priority Analysis

### Qdrant - 🔴 Must Implement

**Why it's necessary:**
1. Current architecture cannot support 1,000+ images
2. ANN index is the only viable solution
3. Also supports metadata filtering (by score, date)

**Benefits:**
- Search latency: seconds → milliseconds
- Supports millions of images
- Supports complex filter queries

### Redis - 🟢 Optional (Not implementing for now)

**What Redis can provide:**

| Scenario | Without Redis | With Redis |
|----------|---------------|------------|
| Repeated searches | Every call to OpenAI API (1-2s) | Cache hit (50ms) |
| Popular queries | 100 queries = 100 API calls | 100 queries = 1 API + 99 cache |
| API cost | Every call costs money | Repeated queries are free |

**But whether it's needed depends on:**

| Factor | Need Cache | Don't Need Cache |
|--------|-----------|-----------------|
| Number of users | Many users | Single user |
| Query repetition rate | Frequently search same content | Every search is different |
| Latency sensitivity | Requires <100ms | 1-2s acceptable |

**Conclusion:** For single user / low query repetition scenarios, Redis is not necessary. Can be added later if needed.

### PostgreSQL + pgvector - 🟡 Optional

**Current status:** Project already supports pgvector, but uses SQLite

**pgvector advantages:**
- Native SQL queries
- HNSW/IVFFlat index support
- Single database (no need for Qdrant)

**However:**
- pgvector index performance is not as good as dedicated vector databases
- Requires additional PostgreSQL deployment

**Recommendation:** If you prefer using a relational database, you can:
1. Use PostgreSQL + pgvector + HNSW index
2. Skip Qdrant

---

## 🚀 Implementation Recommendations

### Option A: Qdrant (Recommended)

**Best for:** Need best performance, don't mind an additional service

```
Architecture: Backend → Qdrant (vector search)
              Backend → SQLite/PostgreSQL (metadata)
```

**Advantages:**
- Best performance
- Supports complex filtering
- Right tool for the job

### Option B: PostgreSQL + pgvector

**Best for:** Want simpler architecture, don't want an additional service

```
Architecture: Backend → PostgreSQL + pgvector (vectors + metadata)
```

**Advantages:**
- Single database
- SQL is familiar
- One fewer container

**Need to add index:**
```sql
CREATE INDEX ON "Images" USING hnsw (embedding_vector vector_cosine_ops);
```

---

## 📈 Implementation Roadmap

### Phase 1: Qdrant Integration (Priority)

**Goal:** Solve vector search performance issue

**Files to modify:**
1. `image-service/qdrant_client.py` (new) - Qdrant client
2. `image-service/main.py` (modify) - Integrate Qdrant
3. `backend/services/retrievalService.js` (modify) - Call Qdrant API

**Code Example:**

```python
# image-service/qdrant_client.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

class QdrantManager:
    def __init__(self, host="localhost", port=6333):
        self.client = QdrantClient(host=host, port=port)
        self.collection_name = "images"

    def init_collection(self):
        """Initialize collection"""
        if not self.client.collection_exists(self.collection_name):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=1536, distance=Distance.Cosine)
            )

    def upsert_image(self, image_id: int, embedding: list, metadata: dict):
        """Insert/update image vector"""
        self.client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(
                id=image_id,
                vector=embedding,
                payload=metadata  # {filename, description, score, created_at}
            )]
        )

    def search(self, query_vector: list, top_k: int = 20, filters: dict = None):
        """Search for similar images"""
        return self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            query_filter=filters,  # Supports filtering by score, date
            limit=top_k
        )

    def delete_image(self, image_id: int):
        """Delete image vector"""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=[image_id]
        )
```

**Migration Script:** Migrate existing embeddings to Qdrant

```python
# scripts/migrate_to_qdrant.py
import asyncio
from qdrant_client import QdrantManager
# Load all image embeddings from database, batch write to Qdrant
```

### Phase 2: Redis Cache (Optional)

**Trigger condition:** Multi-user usage / high query repetition rate

**Files to modify:**
1. `backend/utils/cache.js` (new)
2. `backend/services/retrievalService.js` (modify)

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

## 🐳 Docker Deployment Configuration

Qdrant and Redis (optional) are already configured in `docker-compose.yml`.

**Start:**
```bash
docker-compose up -d qdrant  # Start Qdrant only
docker-compose up -d         # Start everything (including Redis)
```

---

## 📋 Summary

| Component | Priority | Status | Notes |
|-----------|----------|--------|-------|
| Qdrant    | 🔴 Must  | ⏳ Pending | Solves core performance issue |
| Redis     | 🟢 Optional | ⏸️ Deferred | Not needed for single user |
| PostgreSQL | 🟡 Optional | ✅ Supported | Can replace Qdrant |

**Next Step:** Implement Phase 1 - Qdrant Integration

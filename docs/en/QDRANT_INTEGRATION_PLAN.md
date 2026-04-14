# Qdrant Integration Plan

> [中文版](../zh/QDRANT_INTEGRATION_PLAN.md)


## Goals
Write to Qdrant simultaneously when AI analyzes images, enabling efficient vector retrieval.

## Current Architecture

```
Upload image → Backend → image-service /analyze → Return embedding → Store in PostgreSQL (pgvector)
```

## Target Architecture

```
Upload image → Backend → image-service /analyze → Return embedding →
  ├── Store in PostgreSQL (pgvector) ← Keep as fallback
  └── Store in Qdrant ← New, primary database for vector retrieval
```

---

## Implementation Plan

### Phase 1: Integrate Qdrant into image-service (Auto-write on analysis)

**1.1 Modify image-service analysis endpoints**
- File: `image-service/main.py`
- Modify `/analyze` and `/analyze/upload` endpoints
- Automatically call Qdrant upsert after analysis completes
- Include image_id in the response

**1.2 Define Qdrant Collection Schema**
- Collection name: `images`
- Vector dimensions: 1536
- Payload fields:
  - `image_id` (integer) - Image ID
  - `prompt_id` (integer) - Associated prompt ID
  - `filename` (string) - Filename
  - `description` (string) - AI-generated description

### Phase 2: Backend Call Modifications

**2.1 Modify backend storage logic**
- File: `backend/routes/images.js`
- After analysis completes, also write to Qdrant (via image-service API)

**2.2 Update vector sync logic**
- Sync deletion from Qdrant when images are deleted
- Cleanup mechanism

### Phase 3: Retrieval Optimization

**3.1 Modify retrieval priority**
- File: `backend/services/retrievalService.js`
- Prioritize Qdrant search
- pgvector as fallback

---

## Key Code Locations

| File | Modification |
|------|-------------|
| `image-service/main.py` | Analysis endpoint auto-writes to Qdrant |
| `image-service/qdrant_client.py` | Confirm upsert method supports payload |
| `backend/routes/images.js` | Call Qdrant after analysis completes |
| `backend/services/retrievalService.js` | Adjust retrieval priority |

---

## Execution Order

1. ✅ Confirm Qdrant service is running normally
2. Modify image-service analysis endpoint to auto-write to Qdrant
3. Modify backend call logic
4. Test the complete flow
5. Adjust retrieval logic

---

## Questions to Confirm

1. Should Qdrant collection names be environment-specific (dev/prod)?
2. Do we need to support batch migration of existing data to Qdrant?
3. Should image deletion be soft delete (retain vectors for historical analysis)?

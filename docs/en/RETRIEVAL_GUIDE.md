# AI Retrieval System Design Document

> [中文版](../zh/RETRIEVAL_GUIDE.md)


## Overview

AI Creator Vault's retrieval system uses a multi-layered, multi-modal retrieval architecture, providing flexible search methods and precise result ranking.

## Retrieval Modes

### 1. Keyword Search
- **Use case**: Quickly find specific content
- **Search scope**: Image descriptions, prompt content, filenames
- **Features**: Fast, exact matching

### 2. AI Semantic Search
- **Use case**: Natural language description search
- **Technology**: OpenAI text-embedding-3-small vector model
- **Features**: Understands semantics, finds conceptually similar content

### 3. Image-to-Image Search
- **Use case**: Find similar images based on a reference image
- **Technology**: CLIP image embeddings
- **Features**: Visual similarity matching

### 4. Hybrid Retrieval ⭐
- **Use case**: Get the best search results
- **Technology**: Keyword + semantic retrieval fusion
- **Features**:
  - Combines keyword matching and semantic understanding
  - Uses RRF (Reciprocal Rank Fusion) algorithm to merge results
  - Smart re-ranking considering score, date, and other factors

## Core Algorithms

### Reciprocal Rank Fusion (RRF)

The RRF algorithm is used to fuse multiple ranked result lists:

```
score(d) = Σ (α / (k + rank(d)))

Where:
- d: document
- k: constant (typically 60)
- rank(d): document's rank in a specific list
- α: weight factor
```

**Advantages**:
- No need for score normalization
- Robust against outliers
- Adjustable weights for different retrieval methods

### Result Re-ranking

Re-ranks results by combining multiple factors:

```
finalScore = α·similarity + β·(score/10) + γ·dateScore

Where:
- similarity: Semantic similarity (0-1)
- score: User rating (0-10)
- dateScore: Freshness score (0-1)
- α, β, γ: Configurable weights
```

Default weights:
- Similarity weight: 0.7
- Score weight: 0.2
- Date weight: 0.1

## API Endpoints

### Hybrid Retrieval
```http
POST /api/images/search/hybrid
Content-Type: application/json

{
  "query": "girl in red dress",
  "topK": 20,
  "alpha": 0.7,
  "minScore": 5,
  "maxScore": 10,
  "minSimilarity": 0.6,
  "themeIds": [1, 2, 3]
}
```

**Response Example:**
```json
{
  "query": "girl in red dress",
  "originalQuery": "girl in red dress",
  "totalResults": 15,
  "results": [
    {
      "id": 123,
      "filename": "image.jpg",
      "similarity": 0.85,
      "rerankScore": 0.82,
      "score": 8,
      "matchReasons": [
        "Highly similar content",
        "Contains keyword: red",
        "High-rated content"
      ]
    }
  ]
}
```

### Query Expansion
```http
POST /api/images/search/expand
Content-Type: application/json

{
  "query": "girl"
}
```

**Response Example:**
```json
{
  "originalQuery": "girl",
  "optimizedQuery": "girl",
  "expandedQueries": [
    "girl",
    "female",
    "woman",
    "young girl"
  ]
}
```

### Search Suggestions
```http
GET /api/images/search/suggestions?q=red

{
  "suggestions": [
    "red",
    "red dress",
    "red background"
  ]
}
```

## Match Reason Generation

The system automatically analyzes matching results and generates match reason descriptions:

### Generation Rules

1. **Similarity Reasons**:
   - ≥ 0.8: "Highly similar content"
   - ≥ 0.6: "Similar visual style"

2. **Keyword Matching**:
   - Extract matching keywords from descriptions
   - Show top 2 matching words

3. **Prompt Matching**:
   - Prompt contains the query content

4. **Score Reasons**:
   - ≥ 8: "High-rated content"

5. **Filename Matching**:
   - Filename contains the query term

## Usage Examples

### Frontend Usage

```javascript
// Hybrid retrieval
const response = await fetch('/api/images/search/hybrid', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'girl in a red dress at the park',
    topK: 20,
    alpha: 0.7,  // 70% semantic search, 30% keyword search
  }),
});

const data = await response.json();
console.log(data.results); // Results list with matchReasons
```

### Direct Backend Call

```javascript
const retrievalService = require('./services/retrievalService');

// Execute hybrid retrieval
const results = await retrievalService.hybridSearch(
  'girl in a red dress',
  {
    topK: 20,
    alpha: 0.7,
    minScore: 5,
  }
);

// Results include similarity, re-ranking score, and match reasons
results.forEach(item => {
  console.log(item.id, item.similarity, item.matchReasons);
});
```

## Performance Optimization Suggestions

### 1. Vector Indexing
- PostgreSQL: Use pgvector's HNSW index
- SQLite: Consider using sqlite-vss extension

### 2. Caching Strategy
- Cache popular query results
- Cache query expansion results
- Use Redis to cache vector similarity computation results

### 3. Batch Processing
- Batch generate vector embeddings
- Asynchronous processing for large-scale retrieval

### 4. Query Optimization
- Use query expansion to improve recall rate
- Set reasonable topK values
- Apply filters to reduce candidate set

## Configuration Parameters

### Retrieval Service Configuration

```javascript
// backend/services/retrievalService.js

const defaultConfig = {
  // RRF parameters
  rffConstant: 60,

  // Re-ranking weights
  weights: {
    similarity: 0.7,
    score: 0.2,
    date: 0.1,
  },

  // Default topK
  defaultTopK: 20,

  // Similarity threshold
  minSimilarity: 0.5,
};
```

### Environment Variables

```env
# OpenAI configuration
OPENAI_API_KEY=sk-xxx
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Retrieval configuration
DEFAULT_TOP_K=20
DEFAULT_ALPHA=0.7
MIN_SIMILARITY=0.5
```

## Future Extensions

### 1. Advanced Features
- [ ] Query intent classification
- [ ] Multi-modal fusion (text + image)
- [ ] Personalized retrieval (based on user history)
- [ ] Temporal retrieval (track creative evolution)

### 2. Performance Improvements
- [ ] Vector quantization and approximate search
- [ ] Distributed retrieval
- [ ] GPU acceleration

### 3. Intelligent Enhancements
- [ ] Automatic query rewriting
- [ ] Result diversity optimization
- [ ] Active learning (user feedback optimization)

## Troubleshooting

### Issue: Semantic search returns no results
**Solution:**
1. Check if images have been analyzed (have embeddings)
2. Confirm AI service is running normally
3. Check backend logs

### Issue: Hybrid retrieval results are suboptimal
**Solution:**
1. Adjust the alpha parameter (semantic/keyword weight)
2. Check if the query has been optimized
3. Try using query expansion

### Issue: Similarity computation is slow
**Solution:**
1. Use pgvector for acceleration
2. Reduce topK value
3. Apply pre-filters

## References

- [Reciprocal Rank Fusion](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Text Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)

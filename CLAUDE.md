# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AIGC Assistant is a full-stack application for managing AI-generated content (images and prompts). It features:
- Prompt and image management with scoring
- Theme-based image organization
- AI-powered image analysis using OpenAI embeddings
- Vector similarity search for image retrieval
- **Knowledge Graph visualization** for exploring asset relationships

## Service Architecture

The project consists of three separate services:

1. **Backend** (Node.js + Express, port 3001)
   - RESTful API for prompts, images, themes, and assets
   - Sequelize ORM with dual database support
   - Graph traversal and relationship management

2. **Frontend** (React + Vite, port 5173)
   - Custom hooks for data fetching (`usePrompts`, `useImages`, `useThemes`, `useGraph`, `useAssets`)
   - Reusable components: `StarRating`, `ImageCard`, `ImagePreviewModal`
   - **Interactive Knowledge Graph** using React Flow

3. **Image Service** (Python + FastAPI, port 8001)
   - Image analysis and embedding generation via OpenAI API
   - Semantic search endpoints
   - Batch processing capabilities

## Development Commands

### Start Services
```bash
npm run dev:full        # Start all three services
npm run start:backend   # Backend only (port 3001)
npm run start:frontend  # Frontend only (port 5173)
npm run start:image-service  # Image service only (port 8001)
```

### Stop Services
```bash
./stop.sh               # Stop all running services
```

### Code Quality
```bash
npm run pre-commit:run  # Run all pre-commit hooks manually
npx prettier --write "**/*.js"  # Format JavaScript code
```

## Database Architecture

The application supports two databases via `DB_TYPE` environment variable in `backend/.env`:

| Database | Use Case | Vector Storage |
|----------|----------|----------------|
| SQLite | Development, testing | JSON field (`embedding`) |
| PostgreSQL | Production | pgvector type (`embedding_vector`) |

### Database Configuration

Key files:
- `backend/config/database.js` - Database config factory
- `backend/models/index.js` - Model initialization and relationships
- `backend/models/Image.js` - Image model with conditional vector column

Vector search behavior:
- PostgreSQL with pgvector: Uses native vector type with `<=>` operator for similarity
- SQLite or fallback: Uses cosine similarity on JSON-stored embeddings in Node.js

### Environment Variables (backend/.env)
```env
DB_TYPE=sqlite|postgres
DB_STORAGE=./database.db              # SQLite path
DB_HOST=localhost                      # PostgreSQL
DB_PORT=5432
DB_NAME=aigc_assistant
DB_USER=postgres
DB_PASSWORD=your_password
```

## Vector Search Implementation

The application uses OpenAI embeddings (text-embedding-3-small) for semantic search:

**Backend flow:**
1. Image upload triggers analysis via `imageServiceClient.analyzeUploadedImage()`
2. Python service returns description + embedding
3. Backend stores both:
   - `embedding` (TEXT/JSON) - always stored
   - `embedding_vector` (vector type) - PostgreSQL only

**Search endpoints:**
- `POST /api/images/search` - Text-to-image search
- `POST /api/images/search-by-image` - Image-to-image search

**Key files:**
- `backend/utils/vectorSearch.js` - Vector similarity logic with pgvector fallback
- `backend/services/imageServiceClient.js` - HTTP client to image service
- `image-service/image_processor.py` - Embedding generation and search logic

## Key Architectural Patterns

1. **Model Factory Pattern**: Models are factory functions receiving `(sequelize, dbType)` to handle database-specific features

2. **Conditional Vector Support**: Check `supportsVector()` from config before using pgvector features

3. **Service Communication**: Backend communicates with image service via axios client with timeout handling

4. **Component Structure**:
   - Pages in `frontend/src/pages/` (PromptsPage, ImagesPage, SearchPage, ThemesPage)
   - Reusable components in `frontend/src/components/`
   - Custom hooks in `frontend/src/hooks/` for data fetching

5. **Relationships**:
   - Prompt ↔ Image: One-to-many (promptId foreign key, nullable)
   - Theme ↔ Image: Many-to-many via ThemeImage join table

## Pre-commit Hooks

The project uses pre-commit for code quality:
- **JavaScript**: Prettier (formatting), ESLint (linting)
- **Python**: Black (formatting), Ruff (linting + formatting)
- **General**: End-of-file fixer, trailing whitespace, YAML/JSON validation

Custom hook warns about debug statements (`console.log`, `debugger`, `alert`, TODO, FIXME).

## Database Schema

### Prompts
- id, content (text), score (0-10, nullable), createdAt

### Images
- id, filename, path, score (0-10, nullable), description (AI-generated), embedding (JSON), embeddingModel, analyzedAt, promptId (foreign key, nullable)

### Themes
- id, name, description, createdAt

### ThemeImages (join table)
- themeId, imageId, createdAt

### Assets (Knowledge Graph)
- id, assetType (prompt|image|derived_image), content, filename, path, score, description, metadata (JSONB), embedding, embeddingVector, parentId, derivedType, createdAt, updatedAt

### AssetRelationships (Knowledge Graph)
- id, sourceId, targetId, relationshipType (generated|derived_from|version_of|inspired_by), properties (JSONB), createdAt

## Knowledge Graph Feature

The application includes an interactive knowledge graph for visualizing relationships between creative assets.

**Key capabilities:**
- Visual graph with nodes (assets) and edges (relationships)
- Graph traversal (BFS) and shortest path finding
- Neighbor discovery and connected components
- Derived version tracking (edits, variants, upscales, crops)

**Asset types:** prompt, image, derived_image
**Relationship types:** generated, derived_from, version_of, inspired_by
**Derived types:** edit, variant, upscale, crop

**Key files:**
- `backend/models/Asset.js` - Unified asset model
- `backend/models/AssetRelationship.js` - Relationship model
- `backend/services/graphService.js` - Graph traversal service
- `backend/routes/graph.js` - Graph API endpoints
- `backend/routes/assets.js` - Asset CRUD with derived version support
- `frontend/src/pages/KnowledgeGraphPage.jsx` - Main graph page
- `frontend/src/components/graph/` - Graph visualization components

**Migration:**
```bash
node backend/migrations/migrateToAssets.js
```

See `KNOWLEDGE_GRAPH.md` for detailed documentation.

## Testing APIs

Use `http://localhost:3001/api` for backend endpoints:
- `/prompts` - CRUD for prompts
- `/images` - CRUD + search + analyze endpoints
- `/themes` - CRUD + image association

See `developers.md` for detailed curl command examples.

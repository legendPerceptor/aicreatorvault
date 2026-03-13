# Knowledge Graph Feature

## Overview

The Knowledge Graph feature adds a new "知识图谱" (Knowledge Graph) tab to the AIGC Assistant that visualizes relationships between creative assets. This implementation enables:

- Visual graph of prompts, images, and derived versions
- Interactive graph exploration with zoom, pan, and click interactions
- Graph traversal and path finding between assets
- Asset relationship management
- Derived version tracking (edits, variants, upscales, crops)

## Architecture

### Backend Components

**Models:**
- `backend/models/Asset.js` - Unified asset model supporting prompts, images, and derived images
- `backend/models/AssetRelationship.js` - Relationship model connecting assets
- `backend/models/index.js` - Updated to register new models and relationships

**Services:**
- `backend/services/graphService.js` - Graph traversal and query service with BFS, path finding, and neighbor discovery

**Routes:**
- `backend/routes/graph.js` - Graph API endpoints (nodes, edges, traverse, paths, neighbors)
- `backend/routes/relationships.js` - Relationship management endpoints
- `backend/routes/assets.js` - Unified asset CRUD with derived version support

### Frontend Components

**Hooks:**
- `frontend/src/hooks/useGraph.js` - Graph data fetching and traversal
- `frontend/src/hooks/useAssets.js` - Unified asset management

**Pages:**
- `frontend/src/pages/KnowledgeGraphPage.jsx` - Main graph visualization page

**Components:**
- `frontend/src/components/graph/GraphVisualization.jsx` - React Flow wrapper
- `frontend/src/components/graph/GraphNode.jsx` - Custom node component
- `frontend/src/components/graph/GraphControls.jsx` - Filter controls
- `frontend/src/components/graph/GraphLegend.jsx` - Asset/relationship type legend
- `frontend/src/components/AssetInspector.jsx` - Asset detail inspector

**Utilities:**
- `frontend/src/utils/graphConfig.js` - Graph styling and configuration

## Data Model

### Asset Types

| Type | Description | Icon | Color |
|------|-------------|------|-------|
| `prompt` | Text prompt for AI generation | 📝 | Blue |
| `image` | Original generated image | 🖼️ | Green |
| `derived_image` | Edited/variant image | 🔧 | Amber |

### Relationship Types

| Type | Description | Direction |
|------|-------------|-----------|
| `generated` | Prompt generated an image | Prompt → Image |
| `derived_from` | Image is edited version | Image → Image |
| `version_of` | Image is a version/variant | Image → Image |
| `inspired_by` | Asset references another | Asset → Asset |

### Derived Types

| Type | Description |
|------|-------------|
| `edit` | General edit/modification |
| `variant` | Alternative version |
| `upscale` | Higher resolution version |
| `crop` | Cropped version |

## API Endpoints

### Graph Endpoints

- `GET /api/graph/data` - Get all nodes and edges
- `GET /api/graph/nodes` - Get all nodes with filtering
- `GET /api/graph/edges` - Get all edges with filtering
- `GET /api/graph/traverse/:id` - Traverse from node (BFS)
- `GET /api/graph/paths/:sourceId/:targetId` - Find shortest path
- `GET /api/graph/neighbors/:id` - Get direct neighbors
- `GET /api/graph/nodes/:id` - Get node details with relationships
- `GET /api/graph/stats` - Get graph statistics

### Asset Endpoints

- `GET /api/assets` - Get all assets with filtering
- `GET /api/assets/:id` - Get single asset
- `POST /api/assets` - Create new asset
- `POST /api/assets/upload` - Upload image asset
- `POST /api/assets/:id/derive` - Create derived version
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Relationship Endpoints

- `POST /api/relationships` - Create relationship
- `DELETE /api/relationships/:id` - Delete relationship
- `PUT /api/relationships/:id` - Update relationship properties

## Migration

To migrate existing data to the new Asset model:

```bash
cd /home/yuanjian/Development/aigc-assistant
node backend/migrations/migrateToAssets.js
```

This will:
1. Migrate all Prompts to Assets (type: 'prompt')
2. Migrate all Images to Assets (type: 'image')
3. Create GENERATED relationships from Prompt.promptId → Image relationships
4. Preserve all embeddings and metadata

## Usage

### Basic Graph Navigation

1. **View Graph**: Click the "知识图谱" tab in the navigation
2. **Filter**: Use the sidebar controls to filter by asset/relationship types
3. **Select Node**: Click any node to view details
4. **Expand Neighbors**: Double-click a node to expand its connections
5. **Zoom/Pan**: Use scroll to zoom, drag to pan the graph

### Creating Derived Versions

When uploading an image, specify `parentId` and `derivedType`:

```bash
curl -X POST http://localhost:3001/api/assets/upload \
  -F "image=@path/to/image.jpg" \
  -F "parentId=5" \
  -F "derivedType=crop" \
  -F "description=Cropped version"
```

### Finding Paths

1. Select a source node by clicking it
2. Click "Find Path" in the header
3. The system highlights the shortest path to the first node

### Graph Statistics

View graph statistics:
```bash
curl http://localhost:3001/api/graph/stats
```

Response:
```json
{
  "totalNodes": 42,
  "totalEdges": 38,
  "nodesByType": {
    "prompt": 12,
    "image": 25,
    "derived_image": 5
  },
  "edgesByType": {
    "generated": 25,
    "derived_from": 8,
    "version_of": 3,
    "inspired_by": 2
  }
}
```

## Technical Notes

### Graph Storage

The current implementation uses the existing relational database (SQLite/PostgreSQL) with Sequelize models. The graph service provides graph-like functionality (BFS, path finding) on top of the relational structure.

**Future Enhancement**: For large-scale graphs, Apache Age (PostgreSQL extension) can be enabled for native graph database capabilities with optimized traversal algorithms.

### Performance

- Graph data is fetched in batches with configurable limits
- React Flow handles rendering optimization for large graphs
- Consider implementing virtual rendering for 1000+ nodes

### Backward Compatibility

- Original Prompt and Image tables remain unchanged
- Existing API endpoints continue to work
- Migration is optional and non-destructive

## Future Enhancements

Out of scope for initial implementation but planned:

1. **Additional Asset Types**: PSDs, videos, audio, references
2. **Advanced Layouts**: Hierarchical, circular, force-directed layouts
3. **Graph Export/Import**: Save and load graph configurations
4. **Collaborative Annotations**: Allow users to annotate graph nodes
5. **Graph Analytics**: Centrality measures, community detection
6. **Temporal Visualization**: Show creation timeline
7. **Apache Age Integration**: For optimized graph queries on large datasets
8. **Path Highlighting**: Visual feedback for path finding
9. **Custom Styling**: User-configurable node/edge styles
10. **Graph Search**: Full-text search across graph properties

## Troubleshooting

### Graph Not Loading

1. Check browser console for errors
2. Verify backend is running on port 3001
3. Run migration script if using existing data
4. Check browser network tab for API failures

### Missing Nodes/Edges

1. Verify filters include desired types
2. Check database for Assets/AssetRelationships tables
3. Run migration script to populate initial data

### Performance Issues

1. Reduce graph limit in filters
2. Close unused browser tabs
3. Check database indexes on Asset.id and AssetRelationship columns

## Development

To run the full development environment:

```bash
# Start all services
npm run dev:full

# Or start individually
npm run start:backend    # Backend on :3001
npm run start:frontend   # Frontend on :5173
npm run start:image-service  # Image service on :8001
```

Access the Knowledge Graph at: http://localhost:5173 (click "知识图谱" tab)

# Database Naming Convention Migration Guide

> [中文版](../zh/naming-convention.md)


## Overview

This document describes the complete process of migrating the project from camelCase to snake_case naming conventions.

## Migration Reasons

1. **Follows PostgreSQL Standards**: snake_case is the recommended convention for PostgreSQL
2. **Simplifies SQL Queries**: No need to wrap column names in double quotes
3. **Reduces Errors**: Avoids query errors caused by forgetting quotes
4. **Better Compatibility**: Works better with other database tools and ORMs

## Migration Details

### 1. Sequelize Configuration Update

**File:** `backend/config/database.js`

```javascript
// Added define configuration
const sequelize = new Sequelize({
  ...config,
  define: {
    underscored: true,        // Auto-convert camelCase → snake_case
    freezeTableName: true,    // Don't auto-pluralize table names
    timestamps: true,          // Auto-add createdAt, updatedAt
    createdAt: 'created_at',  // Use snake_case
    updatedAt: 'updated_at', // Use snake_case
  },
});
```

### 2. Model Field Updates

All field names in model files have been changed from camelCase to snake_case:

| Original Field (camelCase) | New Field (snake_case) |
|---------------------------|----------------------|
| `embeddingModel` | `embedding_model` |
| `embeddingVector` | `embedding_vector` |
| `analyzedAt` | `analyzed_at` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `promptId` | `prompt_id` |
| `themeId` | `theme_id` |
| `imageId` | `image_id` |
| `isReference` | `is_reference` |
| `originalUrl` | `original_url` |
| `sourceName` | `source_name` |
| `parentId` | `parent_id` |
| `assetType` | `asset_type` |
| `derivedType` | `derived_type` |
| `relationshipType` | `relationship_type` |
| `sourceId` | `source_id` |
| `targetId` | `target_id` |

### 3. Modified Files

#### Model Files (`backend/models/`)

- `Image.js` - Image model
- `Prompt.js` - Prompt model
- `Theme.js` - Theme model
- `ThemeImage.js` - Theme-image association model
- `Asset.js` - Asset model
- `AssetRelationship.js` - Asset relationship model

#### Configuration Files (`backend/config/`)

- `database.js` - Sequelize configuration

## Database Migration

### Migration Script

**File:** `backend/migrations/rename-all-to-snake-case.sql`

This is a complete migration script that will:

1. Rename all camelCase columns to snake_case
2. Add missing columns
3. Create necessary indexes
4. Add foreign key constraints
5. Verify migration results

### Execute Migration

```bash
# Using docker exec
docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault \
  < backend/migrations/rename-all-to-snake-case.sql

# Or using psql command line
psql -U aicreator -d aicreatorvault -f backend/migrations/rename-all-to-snake-case.sql
```

### Verify Migration

The migration script will automatically verify the results. You can also verify manually:

```sql
-- Check Images table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Images'
ORDER BY column_name;

-- Check Assets table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Assets'
ORDER BY column_name;
```

## Code Usage Guide

### Sequelize Models

Since `underscored: true` is configured, in your code:

- **When creating records**: Use camelCase
  ```javascript
  const image = await Image.create({
    filename: 'test.jpg',
    isReference: true,  // Sequelize auto-converts to is_reference
    originalUrl: 'https://...',
  });
  ```

- **When querying**: Both camelCase and snake_case work
  ```javascript
  // Both work
  const images = await Image.findAll({
    where: { isReference: true }  // camelCase
  });

  const images = await Image.findAll({
    where: { is_reference: true }  // snake_case also works
  });
  ```

### Direct SQL Queries

Now you can use snake_case directly without double quotes:

```sql
-- ✅ Correct (no quotes needed)
SELECT id, filename, is_reference, original_url
FROM images
WHERE is_reference = true;

-- ❌ Wrong (camelCase columns don't exist)
SELECT isReference FROM images;
```

## Field Reference Table

### Images Table

| Code Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `id` | `id` | INTEGER | Primary key |
| `filename` | `filename` | VARCHAR | Filename |
| `path` | `path` | VARCHAR | File path |
| `score` | `score` | INTEGER | Rating |
| `description` | `description` | TEXT | Description |
| `embedding` | `embedding` | TEXT | Embedding vector (JSON) |
| `embeddingModel` | `embedding_model` | VARCHAR | Embedding model name |
| `analyzedAt` | `analyzed_at` | TIMESTAMP | Analysis time |
| `isReference` | `is_reference` | BOOLEAN | Whether it's a reference image |
| `originalUrl` | `original_url` | VARCHAR | Original image URL |
| `sourceName` | `source_name` | VARCHAR | Image source |
| `title` | `title` | VARCHAR | Title |
| `width` | `width` | INTEGER | Width |
| `height` | `height` | INTEGER | Height |
| `promptId` | `prompt_id` | INTEGER | Associated prompt ID |
| `themeId` | `theme_id` | INTEGER | Associated theme ID |
| `createdAt` | `created_at` | TIMESTAMP | Creation time |
| `updatedAt` | `updated_at` | TIMESTAMP | Update time |

### Assets Table

| Code Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `id` | `id` | INTEGER | Primary key |
| `assetType` | `asset_type` | ENUM | Asset type (prompt/image/derived_image) |
| `content` | `content` | TEXT | Content |
| `filename` | `filename` | VARCHAR | Filename |
| `path` | `path` | VARCHAR | File path |
| `score` | `score` | INTEGER | Rating |
| `description` | `description` | TEXT | Description |
| `metadata` | `metadata` | JSONB | Metadata |
| `embedding` | `embedding` | TEXT | Embedding vector (JSON) |
| `embeddingModel` | `embedding_model` | VARCHAR | Embedding model name |
| `embeddingVector` | `embedding_vector` | TEXT | pgvector format vector |
| `parentId` | `parent_id` | INTEGER | Parent asset ID |
| `derivedType` | `derived_type` | ENUM | Derivative type (edit/variant/upscale/crop) |
| `analyzedAt` | `analyzed_at` | TIMESTAMP | Analysis time |
| `createdAt` | `created_at` | TIMESTAMP | Creation time |
| `updatedAt` | `updated_at` | TIMESTAMP | Update time |

### AssetRelationships Table

| Code Field | Database Column | Type | Description |
|-----------|----------------|------|-------------|
| `id` | `id` | INTEGER | Primary key |
| `sourceId` | `source_id` | INTEGER | Source asset ID |
| `targetId` | `target_id` | INTEGER | Target asset ID |
| `relationshipType` | `relationship_type` | ENUM | Relationship type |
| `properties` | `properties` | JSONB | Relationship properties |
| `createdAt` | `created_at` | TIMESTAMP | Creation time |
| `updatedAt` | `updated_at` | TIMESTAMP | Update time |

## FAQ

### Q: Does the code need to be modified after migration?

**A:** No. Since Sequelize is configured with `underscored: true`, you can continue using camelCase in your code. Sequelize will automatically convert to snake_case.

### Q: Will the migration affect existing data?

**A:** No. The migration only renames columns and will not delete or modify any data.

### Q: How to rollback the migration?

**A:**
1. Backup the database
2. Manually rename columns (reverse operation)
3. Or restore the database from backup

### Q: Can this be executed in production?

**A:** It's recommended to verify in a test environment first and ensure you have a complete database backup.

## Migration History

- **2026-03-24**: Initial migration, converted all tables and fields from camelCase to snake_case

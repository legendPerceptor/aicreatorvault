# Database Migration Guide

> [中文版](../zh/migrations-guide.md)


## Migration Purpose

Add fields required for the reference image search feature to the `Images` table.

## New Fields

| Field Name | Type | Default | Description |
|------------|------|---------|-------------|
| `isReference` | BOOLEAN | `false` | Flag indicating if the image is a reference image |
| `originalUrl` | VARCHAR(2048) | NULL | Original image URL |
| `sourceName` | VARCHAR(255) | NULL | Image source (e.g., 'Civitai', 'Pinterest') |
| `title` | VARCHAR(255) | NULL | Image title |
| `width` | INTEGER | NULL | Image width (pixels) |
| `height` | INTEGER | NULL | Image height (pixels) |
| `themeId` | INTEGER | NULL | Associated theme ID (foreign key) |

## Usage

### Method 1: Using Sequelize CLI (Recommended)

**Advantages:** Automatically records migration history, supports rollback

```bash
# 1. Navigate to backend directory
cd backend

# 2. Run migration
npx sequelize-cli db:migrate

# 3. If rollback is needed
npx sequelize-cli db:migrate:undo
```

### Method 2: Using Raw SQL Script

**Advantages:** No dependency on Sequelize, can be executed in any PostgreSQL client

```bash
# 1. Using psql command line
psql -U aicreator -d aicreatorvault -f migrations/add-reference-fields.sql

# 2. Using docker exec (in Docker environment)
docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault < migrations/add-reference-fields.sql

# 3. Or execute after connecting to database directly
psql -U aicreator -d aicreatorvault
\i migrations/add-reference-fields.sql
```

### Method 3: Manual SQL Execution (Not Recommended)

```sql
-- Add fields
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "isReference" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "originalUrl" VARCHAR(2048);
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "sourceName" VARCHAR(255);
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "themeId" INTEGER;

-- Add foreign key (if Themes table exists)
ALTER TABLE "Images"
ADD CONSTRAINT "Images_themeId_fkey"
FOREIGN KEY ("themeId")
REFERENCES "Themes"(id)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_images_is_reference" ON "Images"("isReference");
CREATE INDEX IF NOT EXISTS "idx_images_theme_id" ON "Images"("themeId");
CREATE INDEX IF NOT EXISTS "idx_images_source_name" ON "Images"("sourceName");
```

## Migration Script Features

Both migration scripts will:

1. **Check and rename** potentially existing snake_case columns:
   - `is_reference` → `isReference`
   - `original_url` → `originalUrl`
   - `source_name` → `sourceName`
   - `theme_id` → `themeId`

2. **Add missing fields** (if they don't exist)

3. **Add foreign key constraints** (if Themes table exists)

4. **Add indexes** (improve query performance)

5. **Verify migration results**

## Verify Migration Success

```sql
-- Check if new fields exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name IN ('isReference', 'originalUrl', 'sourceName', 'title', 'width', 'height', 'themeId')
ORDER BY column_name;
```

**Expected Result:**
```
 column_name |          data_type          | is_nullable | column_default
-------------+-----------------------------+-------------+----------------
 height      | integer                     | YES         |
 isReference | boolean                     | NO          | false
 originalUrl | character varying(2048)     | YES         |
 sourceName  | character varying(255)      | YES         |
 themeId     | integer                     | YES         |
 title       | character varying(255)      | YES         |
 width       | integer                     | YES         |
(7 rows)
```

## FAQ

### Q: Migration fails with "column already exists"?

**A:** This is normal, indicating the field already exists. The migration scripts use `IF NOT EXISTS` and will skip existing fields.

### Q: How to confirm migration was successful?

**A:** Run the verification SQL (see above), you should see all 7 new fields.

### Q: Will the migration affect existing data?

**A:** No. The migration only adds new fields and will not modify or delete existing data.

### Q: How to rollback the migration?

**A:**
- **Sequelize CLI:** `npx sequelize-cli db:migrate:undo`
- **Manual:** Delete the added fields (see the `down` section of the SQL script)

### Q: Should I backup before running in production?

**A:** **Strongly recommended!** Although the migration scripts are safe, before running in production you should:

```bash
# Backup database
pg_dump -U aicreator aicreatorvault > backup_$(date +%Y%m%d).sql

# Or using Docker
docker exec aicreatorvault-postgres-1 pg_dump -U aicreator aicreatorvault > backup_$(date +%Y%m%d).sql
```

## Migration History

- **2026-03-24**: Initial version, added fields for reference image search feature

## Related Documentation

- [Sequelize Migrations Documentation](https://sequelize.org/docs/v6/other-topics/migrations/)
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)

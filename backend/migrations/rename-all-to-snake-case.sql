-- =========================================
-- 迁移脚本：将所有表的列名从驼峰格式改为 snake_case
-- =========================================
--
-- 用途：重命名所有表中的驼峰格式列为 snake_case
-- 包括：Images, Prompts, Themes, ThemeImages, Assets, AssetRelationships
--
-- 使用方法：
-- 1. 使用 docker exec：
--    docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault < rename-all-to-snake-case.sql
--
-- 2. 使用 psql 命令行：
--    psql -U aicreator -d aicreatorvault -f rename-all-to-snake-case.sql
--
-- =========================================

\echo '========================================'
\echo '开始迁移：将所有表列名改为 snake_case'
\echo '========================================'
\echo ''

-- =========================================
-- Images 表
-- =========================================
\echo '--- Images 表 ---'

-- 重命名现有列
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "embeddingModel" TO embedding_model; \echo '  ✓ embeddingModel → embedding_model'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "analyzedAt" TO analyzed_at; \echo '  ✓ analyzedAt → analyzed_at'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "createdAt" TO created_at; \echo '  ✓ createdAt → created_at'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "updatedAt" TO updated_at; \echo '  ✓ updatedAt → updated_at'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "promptId" TO prompt_id; \echo '  ✓ promptId → prompt_id'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "isReference" TO is_reference; \echo '  ✓ isReference → is_reference'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "originalUrl" TO original_url; \echo '  ✓ originalUrl → original_url'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "sourceName" TO source_name; \echo '  ✓ sourceName → source_name'
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "themeId" TO theme_id; \echo '  ✓ themeId → theme_id'

-- 删除重复列（如果存在）
ALTER TABLE "Images" DROP COLUMN IF EXISTS original_url; \echo '  ✓ 删除重复列: original_url'

-- 添加缺失列
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS is_reference BOOLEAN DEFAULT false NOT NULL; \echo '  ✓ 检查/添加 is_reference'
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS original_url VARCHAR(2048); \echo '  ✓ 检查/添加 original_url'
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS source_name VARCHAR(255); \echo '  ✓ 检查/添加 source_name'
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS title VARCHAR(255); \echo '  ✓ 检查/添加 title'
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS width INTEGER; \echo '  ✓ 检查/添加 width'
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS height INTEGER; \echo '  ✓ 检查/添加 height'
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS theme_id INTEGER; \echo '  ✓ 检查/添加 theme_id'
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS prompt_id INTEGER; \echo '  ✓ 检查/添加 prompt_id'

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_images_is_reference ON "Images"(is_reference); \echo '  ✓ 添加索引: idx_images_is_reference'
CREATE INDEX IF NOT EXISTS idx_images_theme_id ON "Images"(theme_id); \echo '  ✓ 添加索引: idx_images_theme_id'
CREATE INDEX IF NOT EXISTS idx_images_source_name ON "Images"(source_name); \echo '  ✓ 添加索引: idx_images_source_name'
CREATE INDEX IF NOT EXISTS idx_images_prompt_id ON "Images"(prompt_id); \echo '  ✓ 添加索引: idx_images_prompt_id'

\echo ''

-- =========================================
-- Prompts 表
-- =========================================
\echo '--- Prompts 表 ---'

ALTER TABLE "Prompts" RENAME COLUMN IF EXISTS "createdAt" TO created_at; \echo '  ✓ createdAt → created_at'
ALTER TABLE "Prompts" RENAME COLUMN IF EXISTS "updatedAt" TO updated_at; \echo '  ✓ updatedAt → updated_at'

ALTER TABLE "Prompts" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 created_at'
ALTER TABLE "Prompts" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 updated_at'

\echo ''

-- =========================================
-- Themes 表
-- =========================================
\echo '--- Themes 表 ---'

ALTER TABLE "Themes" RENAME COLUMN IF EXISTS "createdAt" TO created_at; \echo '  ✓ createdAt → created_at'
ALTER TABLE "Themes" RENAME COLUMN IF EXISTS "updatedAt" TO updated_at; \echo '  ✓ updatedAt → updated_at'

ALTER TABLE "Themes" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 created_at'
ALTER TABLE "Themes" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 updated_at'

\echo ''

-- =========================================
-- ThemeImages 表（关联表）
-- =========================================
\echo '--- ThemeImages 表 ---'

ALTER TABLE "ThemeImages" RENAME COLUMN IF EXISTS "themeId" TO theme_id; \echo '  ✓ themeId → theme_id'
ALTER TABLE "ThemeImages" RENAME COLUMN IF EXISTS "imageId" TO image_id; \echo '  ✓ imageId → image_id'
ALTER TABLE "ThemeImages" RENAME COLUMN IF EXISTS "createdAt" TO created_at; \echo '  ✓ createdAt → created_at'
ALTER TABLE "ThemeImages" RENAME COLUMN IF EXISTS "updatedAt" TO updated_at; \echo '  ✓ updatedAt → updated_at'

ALTER TABLE "ThemeImages" ADD COLUMN IF NOT EXISTS theme_id INTEGER; \echo '  ✓ 检查/添加 theme_id'
ALTER TABLE "ThemeImages" ADD COLUMN IF NOT EXISTS image_id INTEGER; \echo '  ✓ 检查/添加 image_id'
ALTER TABLE "ThemeImages" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 created_at'
ALTER TABLE "ThemeImages" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 updated_at'

-- 添加外键
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'themeimages_theme_id_fkey'
  ) THEN
    ALTER TABLE "ThemeImages" ADD CONSTRAINT themeimages_theme_id_fkey
    FOREIGN KEY (theme_id) REFERENCES "Themes"(id) ON UPDATE CASCADE ON DELETE CASCADE;
    \echo '  ✓ 添加外键: themeimages_theme_id_fkey'
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'themeimages_image_id_fkey'
  ) THEN
    ALTER TABLE "ThemeImages" ADD CONSTRAINT themeimages_image_id_fkey
    FOREIGN KEY (image_id) REFERENCES "Images"(id) ON UPDATE CASCADE ON DELETE CASCADE;
    \echo '  ✓ 添加外键: themeimages_image_id_fkey'
  END IF;
END $$;

\echo ''

-- =========================================
-- Assets 表
-- =========================================
\echo '--- Assets 表 ---'

ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "assetType" TO asset_type; \echo '  ✓ assetType → asset_type'
ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "embeddingModel" TO embedding_model; \echo '  ✓ embeddingModel → embedding_model'
ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "embeddingVector" TO embedding_vector; \echo '  ✓ embeddingVector → embedding_vector'
ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "parentId" TO parent_id; \echo '  ✓ parentId → parent_id'
ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "derivedType" TO derived_type; \echo '  ✓ derivedType → derived_type'
ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "analyzedAt" TO analyzed_at; \echo '  ✓ analyzedAt → analyzed_at'
ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "createdAt" TO created_at; \echo '  ✓ createdAt → created_at'
ALTER TABLE "Assets" RENAME COLUMN IF EXISTS "updatedAt" TO updated_at; \echo '  ✓ updatedAt → updated_at'

ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS asset_type VARCHAR(255); \echo '  ✓ 检查/添加 asset_type'
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(255); \echo '  ✓ 检查/添加 embedding_model'
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS embedding_vector TEXT; \echo '  ✓ 检查/添加 embedding_vector'
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS parent_id INTEGER; \echo '  ✓ 检查/添加 parent_id'
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS derived_type VARCHAR(255); \echo '  ✓ 检查/添加 derived_type'
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE; \echo '  ✓ 检查/添加 analyzed_at'
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 created_at'
ALTER TABLE "Assets" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 updated_at'

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON "Assets"(asset_type); \echo '  ✓ 添加索引: idx_assets_asset_type'
CREATE INDEX IF NOT EXISTS idx_assets_parent_id ON "Assets"(parent_id); \echo '  ✓ 添加索引: idx_assets_parent_id'
CREATE INDEX IF NOT EXISTS idx_assets_derived_type ON "Assets"(derived_type); \echo '  ✓ 添加索引: idx_assets_derived_type'
CREATE INDEX IF NOT EXISTS idx_assets_created_at ON "Assets"(created_at); \echo '  ✓ 添加索引: idx_assets_created_at'

\echo ''

-- =========================================
-- AssetRelationships 表
-- =========================================
\echo '--- AssetRelationships 表 ---'

ALTER TABLE "AssetRelationships" RENAME COLUMN IF EXISTS "sourceId" TO source_id; \echo '  ✓ sourceId → source_id'
ALTER TABLE "AssetRelationships" RENAME COLUMN IF EXISTS "targetId" TO target_id; \echo '  ✓ targetId → target_id'
ALTER TABLE "AssetRelationships" RENAME COLUMN IF EXISTS "relationshipType" TO relationship_type; \echo '  ✓ relationshipType → relationship_type'
ALTER TABLE "AssetRelationships" RENAME COLUMN IF EXISTS "createdAt" TO created_at; \echo '  ✓ createdAt → created_at'
ALTER TABLE "AssetRelationships" RENAME COLUMN IF EXISTS "updatedAt" TO updated_at; \echo '  ✓ updatedAt → updated_at'

ALTER TABLE "AssetRelationships" ADD COLUMN IF NOT EXISTS source_id INTEGER; \echo '  ✓ 检查/添加 source_id'
ALTER TABLE "AssetRelationships" ADD COLUMN IF NOT EXISTS target_id INTEGER; \echo '  ✓ 检查/添加 target_id'
ALTER TABLE "AssetRelationships" ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(255); \echo '  ✓ 检查/添加 relationship_type'
ALTER TABLE "AssetRelationships" ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 created_at'
ALTER TABLE "AssetRelationships" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(); \echo '  ✓ 检查/添加 updated_at'

-- 添加索引和外键
CREATE INDEX IF NOT EXISTS idx_asset_relationships_source_id ON "AssetRelationships"(source_id); \echo '  ✓ 添加索引: idx_asset_relationships_source_id'
CREATE INDEX IF NOT EXISTS idx_asset_relationships_target_id ON "AssetRelationships"(target_id); \echo '  ✓ 添加索引: idx_asset_relationships_target_id'
CREATE INDEX IF NOT EXISTS idx_asset_relationships_relationship_type ON "AssetRelationships"(relationship_type); \echo '  ✓ 添加索引: idx_asset_relationships_relationship_type'

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'assetrelationships_source_id_fkey'
  ) THEN
    ALTER TABLE "AssetRelationships" ADD CONSTRAINT assetrelationships_source_id_fkey
    FOREIGN KEY (source_id) REFERENCES "Assets"(id) ON UPDATE CASCADE ON DELETE CASCADE;
    \echo '  ✓ 添加外键: assetrelationships_source_id_fkey'
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'assetrelationships_target_id_fkey'
  ) THEN
    ALTER TABLE "AssetRelationships" ADD CONSTRAINT assetrelationships_target_id_fkey
    FOREIGN KEY (target_id) REFERENCES "Assets"(id) ON UPDATE CASCADE ON DELETE CASCADE;
    \echo '  ✓ 添加外键: assetrelationships_target_id_fkey'
  END IF;
END $$;

\echo ''

-- =========================================
-- 验证迁移结果
-- =========================================
\echo '========================================'
\echo '验证迁移结果'
\echo '========================================'
\echo ''

\echo '--- Images 表 ---'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name IN ('embedding_model', 'analyzed_at', 'created_at', 'updated_at', 'prompt_id', 'is_reference', 'original_url', 'source_name', 'title', 'width', 'height', 'theme_id')
ORDER BY column_name;

\echo ''
\echo '--- Assets 表 ---'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Assets'
  AND column_name IN ('asset_type', 'embedding_model', 'embedding_vector', 'parent_id', 'derived_type', 'analyzed_at', 'created_at', 'updated_at')
ORDER BY column_name;

\echo ''
\echo '========================================'
\echo '✅ 迁移完成！'
\echo '========================================'
\echo ''
\echo '所有列名已从驼峰格式改为 snake_case：'
\echo ''
\echo 'Images 表:'
\echo '  embeddingModel → embedding_model'
\echo '  analyzedAt    → analyzed_at'
\echo '  createdAt    → created_at'
\echo '  updatedAt    → updated_at'
\echo '  promptId     → prompt_id'
\echo '  isReference  → is_reference'
\echo '  originalUrl  → original_url'
\echo '  sourceName    → source_name'
\echo '  themeId      → theme_id'
\echo ''
\echo 'Assets 表:'
\echo '  assetType      → asset_type'
\echo '  embeddingModel → embedding_model'
\echo '  embeddingVector → embedding_vector'
\echo '  parentId       → parent_id'
\echo '  derivedType    → derived_type'
\echo '  analyzedAt     → analyzed_at'
\echo ''
\echo 'AssetRelationships 表:'
\echo '  sourceId         → source_id'
\echo '  targetId        → target_id'
\echo '  relationshipType → relationship_type'
\echo ''

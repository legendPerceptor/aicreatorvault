-- =========================================
-- 迁移脚本：将列名从驼峰格式改为 snake_case
-- =========================================
--
-- 用途：重命名 Images 表中的所有驼峰格式列为 snake_case
--
-- 使用方法：
-- 1. 使用 docker exec：
--    docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault < rename-to-snake-case.sql
--
-- 2. 使用 psql 命令行：
--    psql -U aicreator -d aicreatorvault -f rename-to-snake-case.sql
--
-- =========================================

\echo '开始迁移：将列名从驼峰格式改为 snake_case...'
\echo ''

-- =========================================
-- 步骤 1: 重命名现有列
-- =========================================

-- 重命名 embeddingModel → embedding_model
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "embeddingModel" TO embedding_model;
\echo '  ✓ embeddingModel → embedding_model'

-- 重命名 analyzedAt → analyzed_at
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "analyzedAt" TO analyzed_at;
\echo '  ✓ analyzedAt → analyzed_at'

-- 重命名 createdAt → created_at
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "createdAt" TO created_at;
\echo '  ✓ createdAt → created_at'

-- 重命名 updatedAt → updated_at
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "updatedAt" TO updated_at;
\echo '  ✓ updatedAt → updated_at'

-- 重命名 promptId → prompt_id
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "promptId" TO prompt_id;
\echo '  ✓ promptId → prompt_id'

-- 重命名 isReference → is_reference
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "isReference" TO is_reference;
\echo '  ✓ isReference → is_reference'

-- 重命名 originalUrl → original_url
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "originalUrl" TO original_url;
\echo '  ✓ originalUrl → original_url'

-- 重命名 sourceName → source_name
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "sourceName" TO source_name;
\echo '  ✓ sourceName → source_name'

-- 重命名 themeId → theme_id (如果存在)
ALTER TABLE "Images" RENAME COLUMN IF EXISTS "themeId" TO theme_id;
\echo '  ✓ themeId → theme_id'

\echo ''

-- =========================================
-- 步骤 2: 添加缺失的列（如果不存在）
-- =========================================

-- 添加 is_reference（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS is_reference BOOLEAN DEFAULT false NOT NULL;
\echo '  ✓ 检查/添加 is_reference'

-- 添加 original_url（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS original_url VARCHAR(2048);
\echo '  ✓ 检查/添加 original_url'

-- 添加 source_name（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);
\echo '  ✓ 检查/添加 source_name'

-- 添加 title（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS title VARCHAR(255);
\echo '  ✓ 检查/添加 title'

-- 添加 width（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS width INTEGER;
\echo '  ✓ 检查/添加 width'

-- 添加 height（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS height INTEGER;
\echo '  ✓ 检查/添加 height'

-- 添加 theme_id（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS theme_id INTEGER;
\echo '  ✓ 检查/添加 theme_id'

-- 添加 prompt_id（如果不存在）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS prompt_id INTEGER;
\echo '  ✓ 检查/添加 prompt_id'

\echo ''

-- =========================================
-- 步骤 3: 添加索引
-- =========================================

-- 为 is_reference 添加索引
CREATE INDEX IF NOT EXISTS idx_images_is_reference ON "Images"(is_reference);
\echo '  ✓ 添加索引: idx_images_is_reference'

-- 为 theme_id 添加索引
CREATE INDEX IF NOT EXISTS idx_images_theme_id ON "Images"(theme_id);
\echo '  ✓ 添加索引: idx_images_theme_id'

-- 为 source_name 添加索引
CREATE INDEX IF NOT EXISTS idx_images_source_name ON "Images"(source_name);
\echo '  ✓ 添加索引: idx_images_source_name'

-- 为 prompt_id 添加索引
CREATE INDEX IF NOT EXISTS idx_images_prompt_id ON "Images"(prompt_id);
\echo '  ✓ 添加索引: idx_images_prompt_id'

\echo ''

-- =========================================
-- 步骤 4: 验证迁移结果
-- =========================================

\echo '验证迁移结果...'
\echo ''

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name IN (
    'embedding_model', 'analyzed_at', 'created_at', 'updated_at', 'prompt_id',
    'is_reference', 'original_url', 'source_name', 'title', 'width', 'height', 'theme_id'
  )
ORDER BY column_name;

\echo ''
\echo '✅ 迁移完成！'
\echo ''
\echo '列名已从驼峰格式改为 snake_case：'
\echo '  embeddingModel  → embedding_model'
\echo '  analyzedAt      → analyzed_at'
\echo '  createdAt       → created_at'
\echo '  updatedAt       → updated_at'
\echo '  promptId        → prompt_id'
\echo '  isReference     → is_reference'
\echo '  originalUrl     → original_url'
\echo '  sourceName      → source_name'
\echo '  themeId         → theme_id'

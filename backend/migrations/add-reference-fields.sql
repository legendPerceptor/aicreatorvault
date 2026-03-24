-- =========================================
-- 迁移脚本：添加参考图搜索字段
-- =========================================
--
-- 用途：为 Images 表添加参考图搜索功能所需的字段
--
-- 使用方法：
-- 1. 使用 psql 命令行：
--    psql -U aicreator -d aicreatorvault -f add-reference-fields.sql
--
-- 2. 使用 docker exec：
--    docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault < add-reference-fields.sql
--
-- 3. 直接连接数据库后执行：
--    \i add-reference-fields.sql
--
-- =========================================

\echo '开始迁移：添加参考图搜索字段...'

-- =========================================
-- 步骤 1: 重命名可能存在的 snake_case 列
-- =========================================

-- 重命名 is_reference → isReference（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Images' AND column_name = 'is_reference'
  ) THEN
    ALTER TABLE "Images" RENAME COLUMN "is_reference" TO "isReference";
    RAISE NOTICE '重命名列: is_reference → isReference';
  END IF;
END $$;

-- 重命名 original_url → originalUrl（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Images' AND column_name = 'original_url'
  ) THEN
    ALTER TABLE "Images" RENAME COLUMN "original_url" TO "originalUrl";
    RAISE NOTICE '重命名列: original_url → originalUrl';
  END IF;
END $$;

-- 重命名 source_name → sourceName（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Images' AND column_name = 'source_name'
  ) THEN
    ALTER TABLE "Images" RENAME COLUMN "source_name" TO "sourceName";
    RAISE NOTICE '重命名列: source_name → sourceName';
  END IF;
END $$;

-- 重命名 theme_id → themeId（如果存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Images' AND column_name = 'theme_id'
  ) THEN
    ALTER TABLE "Images" RENAME COLUMN "theme_id" TO "themeId";
    RAISE NOTICE '重命名列: theme_id → themeId';
  END IF;
END $$;

-- =========================================
-- 步骤 2: 添加缺失的新字段
-- =========================================

-- 添加 isReference 字段（布尔值，标记是否为参考图）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "isReference" BOOLEAN DEFAULT false NOT NULL;

-- 添加 originalUrl 字段（原始图片 URL）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "originalUrl" VARCHAR(2048);

-- 添加 sourceName 字段（图片来源名称，如 'Civitai', 'Pinterest' 等）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "sourceName" VARCHAR(255);

-- 添加 title 字段（图片标题）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);

-- 添加 width 字段（图片宽度，像素）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "width" INTEGER;

-- 添加 height 字段（图片高度，像素）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "height" INTEGER;

-- 添加 themeId 字段（关联的主题 ID）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "themeId" INTEGER;

-- =========================================
-- 步骤 3: 添加外键约束（可选）
-- =========================================

-- 为 themeId 添加外键约束（如果 Themes 表存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Themes'
  ) THEN
    -- 检查约束是否已存在
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'Images_themeId_fkey'
    ) THEN
      ALTER TABLE "Images"
      ADD CONSTRAINT "Images_themeId_fkey"
      FOREIGN KEY ("themeId")
      REFERENCES "Themes"(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;

      RAISE NOTICE '添加外键约束: Images.themeId → Themes.id';
    END IF;
  END IF;
END $$;

-- =========================================
-- 步骤 4: 添加索引（可选，提升查询性能）
-- =========================================

-- 为 isReference 添加索引
CREATE INDEX IF NOT EXISTS "idx_images_is_reference" ON "Images"("isReference");

-- 为 themeId 添加索引
CREATE INDEX IF NOT EXISTS "idx_images_theme_id" ON "Images"("themeId");

-- 为 sourceName 添加索引
CREATE INDEX IF NOT EXISTS "idx_images_source_name" ON "Images"("sourceName");

-- =========================================
-- 步骤 5: 验证迁移结果
-- =========================================

\echo '验证迁移结果...'

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name IN ('isReference', 'originalUrl', 'sourceName', 'title', 'width', 'height', 'themeId')
ORDER BY column_name;

\echo '✅ 迁移完成！'

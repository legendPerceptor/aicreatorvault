-- =========================================
-- 迁移脚本：添加参考图搜索字段（snake_case 版本）
-- =========================================
--
-- 用途：为 Images 表添加参考图搜索功能所需的字段
-- 命名：使用 snake_case（PostgreSQL 标准）
--
-- 使用方法：
-- 1. 使用 psql 命令行：
--    psql -U aicreator -d aicreatorvault -f add-reference-fields-v2.sql
--
-- 2. 使用 docker exec：
--    docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault < add-reference-fields-v2.sql
--
-- =========================================

\echo '开始迁移：添加参考图搜索字段（snake_case 版本）...'

-- =========================================
-- 添加新字段（使用 snake_case，不加引号）
-- =========================================

-- 添加 is_reference 字段（布尔值，标记是否为参考图）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS is_reference BOOLEAN DEFAULT false NOT NULL;

-- 添加 original_url 字段（原始图片 URL）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS original_url VARCHAR(2048);

-- 添加 source_name 字段（图片来源名称）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);

-- 添加 title 字段（图片标题）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- 添加 width 字段（图片宽度，像素）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS width INTEGER;

-- 添加 height 字段（图片高度，像素）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS height INTEGER;

-- 添加 theme_id 字段（关联的主题 ID）
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS theme_id INTEGER;

-- =========================================
-- 添加外键约束（可选）
-- =========================================

-- 为 theme_id 添加外键约束（如果 Themes 表存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'Themes'
  ) THEN
    -- 检查约束是否已存在
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'images_theme_id_fkey'
    ) THEN
      ALTER TABLE "Images"
      ADD CONSTRAINT images_theme_id_fkey
      FOREIGN KEY (theme_id)
      REFERENCES "Themes"(id)
      ON UPDATE CASCADE
      ON DELETE SET NULL;

      RAISE NOTICE '添加外键约束: images.theme_id → themes.id';
    END IF;
  END IF;
END $$;

-- =========================================
-- 添加索引（提升查询性能）
-- =========================================

-- 为 is_reference 添加索引
CREATE INDEX IF NOT EXISTS idx_images_is_reference ON "Images"(is_reference);

-- 为 theme_id 添加索引
CREATE INDEX IF NOT EXISTS idx_images_theme_id ON "Images"(theme_id);

-- 为 source_name 添加索引
CREATE INDEX IF NOT EXISTS idx_images_source_name ON "Images"(source_name);

-- =========================================
-- 验证迁移结果
-- =========================================

\echo '验证迁移结果...'

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name IN ('is_reference', 'original_url', 'source_name', 'title', 'width', 'height', 'theme_id')
ORDER BY column_name;

\echo '✅ 迁移完成！'
\echo ''
\echo '注意：'
\echo '  数据库列名：is_reference, original_url, source_name, theme_id'
\echo '  模型字段名：isReference, originalUrl, sourceName, themeId'
\echo '  Sequelize 会自动转换（underscored: true）'

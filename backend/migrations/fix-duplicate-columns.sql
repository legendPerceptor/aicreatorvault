-- =========================================
-- 清理重复列脚本
-- =========================================
--
-- 问题：数据库中同时存在 original_url 和 "originalUrl"
-- 解决：删除重复的 original_url，保留 "originalUrl"
--
-- =========================================

\echo '检查重复列...'

-- 显示重复的列
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name IN ('original_url', 'originalUrl')
ORDER BY column_name;

\echo ''
\echo '删除重复列 original_url...'

-- 删除重复的 original_url 列
ALTER TABLE "Images" DROP COLUMN IF EXISTS original_url;

\echo ''
\echo '验证结果...'

-- 再次检查
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name LIKE '%url%'
ORDER BY column_name;

\echo '✅ 清理完成！'

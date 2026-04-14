# 数据库迁移说明

> [English](../en/migrations-guide.md)


## 迁移目的

为 `Images` 表添加参考图搜索功能所需的字段。

## 新增字段

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isReference` | BOOLEAN | `false` | 标记是否为参考图 |
| `originalUrl` | VARCHAR(2048) | NULL | 原始图片 URL |
| `sourceName` | VARCHAR(255) | NULL | 图片来源（如 'Civitai', 'Pinterest'） |
| `title` | VARCHAR(255) | NULL | 图片标题 |
| `width` | INTEGER | NULL | 图片宽度（像素） |
| `height` | INTEGER | NULL | 图片高度（像素） |
| `themeId` | INTEGER | NULL | 关联的主题 ID（外键） |

## 使用方法

### 方法 1：使用 Sequelize CLI（推荐）

**优点：** 自动记录迁移历史，支持回滚

```bash
# 1. 进入 backend 目录
cd backend

# 2. 执行迁移
npx sequelize-cli db:migrate

# 3. 如果需要回滚
npx sequelize-cli db:migrate:undo
```

### 方法 2：使用纯 SQL 脚本

**优点：** 不依赖 Sequelize，可以在任何 PostgreSQL 客户端执行

```bash
# 1. 使用 psql 命令行
psql -U aicreator -d aicreatorvault -f migrations/add-reference-fields.sql

# 2. 使用 docker exec（在 Docker 环境中）
docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault < migrations/add-reference-fields.sql

# 3. 或者直接连接数据库后执行
psql -U aicreator -d aicreatorvault
\i migrations/add-reference-fields.sql
```

### 方法 3：手动执行 SQL（不推荐）

```sql
-- 添加字段
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "isReference" BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "originalUrl" VARCHAR(2048);
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "sourceName" VARCHAR(255);
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "width" INTEGER;
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "height" INTEGER;
ALTER TABLE "Images" ADD COLUMN IF NOT EXISTS "themeId" INTEGER;

-- 添加外键（如果 Themes 表存在）
ALTER TABLE "Images"
ADD CONSTRAINT "Images_themeId_fkey"
FOREIGN KEY ("themeId")
REFERENCES "Themes"(id)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- 添加索引
CREATE INDEX IF NOT EXISTS "idx_images_is_reference" ON "Images"("isReference");
CREATE INDEX IF NOT EXISTS "idx_images_theme_id" ON "Images"("themeId");
CREATE INDEX IF NOT EXISTS "idx_images_source_name" ON "Images"("sourceName");
```

## 迁移脚本功能

两个迁移脚本都会：

1. **检查并重命名** 可能存在的 snake_case 列：
   - `is_reference` → `isReference`
   - `original_url` → `originalUrl`
   - `source_name` → `sourceName`
   - `theme_id` → `themeId`

2. **添加缺失的字段**（如果不存在）

3. **添加外键约束**（如果 Themes 表存在）

4. **添加索引**（提升查询性能）

5. **验证迁移结果**

## 验证迁移成功

```sql
-- 检查新字段是否存在
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Images'
  AND column_name IN ('isReference', 'originalUrl', 'sourceName', 'title', 'width', 'height', 'themeId')
ORDER BY column_name;
```

**预期结果：**
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

## 常见问题

### Q: 迁移失败提示 "column already exists"？

**A:** 这是正常的，说明该字段已经存在。迁移脚本使用了 `IF NOT EXISTS`，会跳过已存在的字段。

### Q: 如何确认迁移是否成功？

**A:** 运行验证 SQL（见上方），应该看到所有 7 个新字段。

### Q: 迁移会影响现有数据吗？

**A:** 不会。迁移只会添加新字段，不会修改或删除现有数据。

### Q: 如何回滚迁移？

**A:**
- **Sequelize CLI:** `npx sequelize-cli db:migrate:undo`
- **手动:** 删除添加的字段（见 SQL 脚本的 `down` 部分）

### Q: 在生产环境执行前需要备份吗？

**A:** **强烈建议备份！** 虽然迁移脚本很安全，但在生产环境执行前应该：

```bash
# 备份数据库
pg_dump -U aicreator aicreatorvault > backup_$(date +%Y%m%d).sql

# 或者使用 Docker
docker exec aicreatorvault-postgres-1 pg_dump -U aicreator aicreatorvault > backup_$(date +%Y%m%d).sql
```

## 迁移历史

- **2026-03-24**: 初始版本，添加参考图搜索功能所需字段

## 相关文档

- [Sequelize Migrations 文档](https://sequelize.org/docs/v6/other-topics/migrations/)
- [PostgreSQL ALTER TABLE 文档](https://www.postgresql.org/docs/current/sql-altertable.html)

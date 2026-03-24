# 数据库命名约定迁移说明

## 概述

本文档说明了项目从驼峰格式（camelCase）迁移到蛇形命名格式（snake_case）的完整过程。

## 迁移原因

1. **符合 PostgreSQL 标准**：蛇形命名是 PostgreSQL 的推荐约定
2. **简化 SQL 查询**：不需要用双引号包裹列名
3. **减少错误**：避免忘记加引号导致的查询错误
4. **更好的兼容性**：与其他数据库工具和 ORM 更好地兼容

## 迁移内容

### 1. Sequelize 配置更新

**文件**: `backend/config/database.js`

```javascript
// 添加了 define 配置
const sequelize = new Sequelize({
  ...config,
  define: {
    underscored: true,        // 自动转换 camelCase → snake_case
    freezeTableName: true,    // 不自动复数化表名
    timestamps: true,          // 自动添加 createdAt, updatedAt
    createdAt: 'created_at',  // 使用 snake_case
    updatedAt: 'updated_at', // 使用 snake_case
  },
});
```

### 2. 模型字段更新

所有模型文件中的字段名已从驼峰格式改为蛇形格式：

| 原字段名 (camelCase) | 新字段名 (snake_case) |
|---------------------|---------------------|
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

### 3. 修改的文件

#### 模型文件 (`backend/models/`)

- `Image.js` - 图片模型
- `Prompt.js` - 提示词模型
- `Theme.js` - 主题模型
- `ThemeImage.js` - 主题-图片关联模型
- `Asset.js` - 资产模型
- `AssetRelationship.js` - 资产关系模型

#### 配置文件 (`backend/config/`)

- `database.js` - Sequelize 配置

## 数据库迁移

### 迁移脚本

**文件**: `backend/migrations/rename-all-to-snake-case.sql`

这是一个完整的迁移脚本，会：

1. 重命名所有驼峰格式的列为蛇形格式
2. 添加缺失的列
3. 创建必要的索引
4. 添加外键约束
5. 验证迁移结果

### 执行迁移

```bash
# 使用 docker exec
docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault \
  < backend/migrations/rename-all-to-snake-case.sql

# 或者使用 psql 命令行
psql -U aicreator -d aicreatorvault -f backend/migrations/rename-all-to-snake-case.sql
```

### 验证迁移

迁移脚本会自动验证结果。你也可以手动验证：

```sql
-- 检查 Images 表
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Images'
ORDER BY column_name;

-- 检查 Assets 表
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Assets'
ORDER BY column_name;
```

## 代码使用指南

### Sequelize 模型

由于配置了 `underscored: true`，在代码中：

- **创建记录时**：使用 camelCase
  ```javascript
  const image = await Image.create({
    filename: 'test.jpg',
    isReference: true,  // Sequelize 自动转换为 is_reference
    originalUrl: 'https://...',
  });
  ```

- **查询时**：使用 camelCase 或 snake_case 都可以
  ```javascript
  // 两种方式都可以
  const images = await Image.findAll({
    where: { isReference: true }  // camelCase
  });

  const images = await Image.findAll({
    where: { is_reference: true }  // snake_case 也可以
  });
  ```

### 直接 SQL 查询

现在可以直接使用 snake_case，不需要双引号：

```sql
-- ✅ 正确（不需要引号）
SELECT id, filename, is_reference, original_url
FROM images
WHERE is_reference = true;

-- ❌ 错误（驼峰格式找不到列）
SELECT isReference FROM images;
```

## 字段对照表

### Images 表

| 代码字段 | 数据库列名 | 类型 | 说明 |
|---------|----------|------|------|
| `id` | `id` | INTEGER | 主键 |
| `filename` | `filename` | VARCHAR | 文件名 |
| `path` | `path` | VARCHAR | 文件路径 |
| `score` | `score` | INTEGER | 评分 |
| `description` | `description` | TEXT | 描述 |
| `embedding` | `embedding` | TEXT | 嵌入向量 (JSON) |
| `embeddingModel` | `embedding_model` | VARCHAR | 嵌入模型名称 |
| `analyzedAt` | `analyzed_at` | TIMESTAMP | 分析时间 |
| `isReference` | `is_reference` | BOOLEAN | 是否为参考图 |
| `originalUrl` | `original_url` | VARCHAR | 原始图片 URL |
| `sourceName` | `source_name` | VARCHAR |图片来源 |
| `title` | `title` | VARCHAR | 标题 |
| `width` | `width` | INTEGER | 宽度 |
| `height` | `height` | INTEGER | 高度 |
| `promptId` | `prompt_id` | INTEGER | 关联的提示词 ID |
| `themeId` | `theme_id` | INTEGER | 关联的主题 ID |
| `createdAt` | `created_at` | TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TIMESTAMP | 更新时间 |

### Assets 表

| 代码字段 | 数据库列名 | 类型 | 说明 |
|---------|----------|------|------|
| `id` | `id` | INTEGER | 主键 |
| `assetType` | `asset_type` | ENUM | 资产类型 (prompt/image/derived_image) |
| `content` | `content` | TEXT | 内容 |
| `filename` | `filename` | VARCHAR | 文件名 |
| `path` | `path` | VARCHAR | 文件路径 |
| `score` | `score` | INTEGER | 评分 |
| `description` | `description` | TEXT | 描述 |
| `metadata` | `metadata` | JSONB | 元数据 |
| `embedding` | `embedding` | TEXT | 嵌入向量 (JSON) |
| `embeddingModel` | `embedding_model` | VARCHAR | 嵌入模型名称 |
| `embeddingVector` | `embedding_vector` | TEXT | pgvector 格式向量 |
| `parentId` | `parent_id` | INTEGER | 父资产 ID |
| `derivedType` | `derived_type` | ENUM | 派生类型 (edit/variant/upscale/crop) |
| `analyzedAt` | `analyzed_at` | TIMESTAMP | 分析时间 |
| `createdAt` | `created_at` | TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TIMESTAMP | 更新时间 |

### AssetRelationships 表

| 代码字段 | 数据库列名 | 类型 | 说明 |
|---------|----------|------|------|
| `id` | `id` | INTEGER | 主键 |
| `sourceId` | `source_id` | INTEGER | 源资产 ID |
| `targetId` | `target_id` | INTEGER | 目标资产 ID |
| `relationshipType` | `relationship_type` | ENUM | 关系类型 |
| `properties` | `properties` | JSONB | 关系属性 |
| `createdAt` | `created_at` | TIMESTAMP | 创建时间 |
| `updatedAt` | `updated_at` | TIMESTAMP | 更新时间 |

## 常见问题

### Q: 迁移后代码需要修改吗？

**A**: 不需要。由于 Sequelize 配置了 `underscored: true`，在代码中继续使用 camelCase 即可，Sequelize 会自动转换为 snake_case。

### Q: 迁移会影响现有数据吗？

**A**: 不会。迁移只是重命序列，不会删除或修改任何数据。

### Q: 如何回滚迁移？

**A**:
1. 备份数据库
2. 手动重命名列（反向操作）
3. 或者从备份恢复数据库

### Q: 可以在生产环境执行吗？

**A**: 建议先在测试环境验证，并确保有完整的数据库备份。

## 迁移历史

- **2026-03-24**: 初始迁移，将所有表和字段从驼峰格式改为蛇形格式

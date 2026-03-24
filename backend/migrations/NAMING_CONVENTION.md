# 数据库字段命名约定说明

## ⚠️ 重要发现：PostgreSQL 列名大小写问题

### 问题背景

你提出了一个**非常正确**的观察：

> "数据库通常是不区分大小写的，如果用了驼峰形式，必须要用引号对吧"

**你说得完全正确！** 这是 PostgreSQL 的一个重要特性。

---

## 🔍 PostgreSQL 命名规则

### 1. **不加引号（推荐）**

```sql
-- 创建列
ALTER TABLE images ADD COLUMN is_reference BOOLEAN;

-- 查询时（两种写法都可以）
SELECT is_reference FROM images;     -- ✅ 正确
SELECT IS_REFERENCE FROM images;     -- ✅ 正确（自动转为小写）
SELECT is_Reference FROM images;     -- ✅ 正确（自动转为小写）
```

**结果：** 列名存储为 `is_reference`（小写）

### 2. **加引号（区分大小写）**

```sql
-- 创建列（加引号）
ALTER TABLE images ADD COLUMN "isReference" BOOLEAN;

-- 查询时（必须加引号，且大小写必须完全一致）
SELECT "isReference" FROM images;    -- ✅ 正确
SELECT isReference FROM images;      -- ❌ 错误！找不到列 isreference
SELECT "isreference" FROM images;    -- ❌ 错误！大小写不匹配
```

**结果：** 列名存储为 `"isReference"`（保留大小写）

---

## 📊 当前数据库状态

### 检查结果

```bash
$ docker exec aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault -c "
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Images';
"
```

**当前列名：**
```
 id, filename, path, score, description, embedding,
 embeddingModel,    -- ⚠️ 带引号的驼峰格式
 analyzedAt,        -- ⚠️ 带引号的驼峰格式
 createdAt,         -- ⚠️ 带引号的驼峰格式
 updatedAt,         -- ⚠️ 带引号的驼峰格式
 promptId,          -- ⚠️ 带引号的驼峰格式
 isReference,       -- ⚠️ 带引号的驼峰格式
 originalUrl,       -- ⚠️ 带引号的驼峰格式
 sourceName,        -- ⚠️ 带引号的驼峰格式
 themeId            -- ⚠️ 带引号的驼峰格式
```

### 分析

**项目的数据库设计从一开始就使用了带引号的驼峰格式！**

这是项目的一贯风格，不是我这次迁移造成的。

---

## 🎯 两种解决方案

### **方案 A：保持驼峰格式（带引号）** ⭐ **推荐**

**理由：** 与现有数据库设计保持一致

**优点：**
- ✅ 与现有列（`embeddingModel`, `analyzedAt` 等）一致
- ✅ 代码和数据库命名完全一致，直观
- ✅ 不需要修改现有代码

**缺点：**
- ⚠️ 所有 SQL 查询必须使用双引号
- ⚠️ 容易出错（忘记加引号会报错）

**使用方法：** 使用我之前提供的迁移脚本（v1 版本）

```bash
# 迁移文件
backend/migrations/20260324000000-add-reference-fields.js
backend/migrations/add-reference-fields.sql
```

**SQL 示例：**
```sql
-- 必须用双引号
SELECT "isReference", "originalUrl" FROM "Images";
```

---

### **方案 B：改为 snake_case（不加引号）**

**理由：** 符合 PostgreSQL 标准约定

**优点：**
- ✅ 符合数据库命名规范
- ✅ SQL 查询简单，不需要双引号
- ✅ 不容易出错

**缺点：**
- ❌ 需要重命名所有现有列（破坏性大）
- ❌ 需要修改大量现有代码
- ❌ 与项目现有风格不一致

**使用方法：** 使用新创建的 v2 迁移脚本

```bash
# 迁移文件
backend/migrations/20260324000000-add-reference-fields-v2.js
backend/migrations/add-reference-fields-v2.sql
```

**SQL 示例：**
```sql
-- 不需要双引号
SELECT is_reference, original_url FROM images;
```

**但需要同时配置 Sequelize：**
```javascript
// models/index.js
const sequelize = new Sequelize(/* ... */, {
  define: {
    underscored: true,  // 自动转换 camelCase → snake_case
    freezeTableName: true
  }
});
```

---

## 💡 我的建议

### **使用方案 A（保持驼峰格式）**

**理由：**
1. **项目已有约定：** 数据库从一开始就使用带引号的驼峰格式
2. **最小改动：** 不需要修改现有代码
3. **一致性：** 保持项目风格统一

**注意事项：**
- 所有手动 SQL 查询必须使用双引号
- 使用 Sequelize 查询时不需要担心（ORM 会自动处理）

---

## 🔧 修复重复列问题

### 当前问题

数据库中同时存在：
- `original_url`（无引号）
- `originalUrl`（带引号）

### 解决方案

```bash
# 执行清理脚本
docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault \
  < backend/migrations/fix-duplicate-columns.sql
```

这个脚本会删除重复的 `original_url` 列，保留 `originalUrl`。

---

## 📋 迁移文件说明

### v1 版本（驼峰格式，带引号）

```
backend/migrations/
├── 20260324000000-add-reference-fields.js  # Sequelize 迁移
├── add-reference-fields.sql                # 纯 SQL 迁移
└── fix-duplicate-columns.sql               # 清理重复列
```

**适用场景：** 保持项目现有风格

### v2 版本（snake_case，不带引号）

```
backend/migrations/
├── 20260324000000-add-reference-fields-v2.js  # Sequelize 迁移
└── add-reference-fields-v2.sql                # 纯 SQL 迁移
```

**适用场景：** 从头开始的新项目，或愿意大改现有代码

---

## 🚀 推荐执行步骤

### 如果选择方案 A（推荐）

```bash
# 1. 备份数据库
docker exec aicreatorvault-postgres-1 pg_dump -U aicreator aicreatorvault \
  > backup_$(date +%Y%m%d).sql

# 2. 清理重复列
docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault \
  < backend/migrations/fix-duplicate-columns.sql

# 3. 验证
docker exec aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault -c "
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'Images'
ORDER BY column_name;
"
```

### 如果选择方案 B

```bash
# 1. 备份数据库（必须！）
docker exec aicreatorvault-postgres-1 pg_dump -U aicreator aicreatorvault \
  > backup_$(date +%Y%m%d).sql

# 2. 执行 v2 迁移
docker exec -i aicreatorvault-postgres-1 psql -U aicreator -d aicreatorvault \
  < backend/migrations/add-reference-fields-v2.sql

# 3. 修改 Sequelize 配置
# 编辑 models/index.js，添加 underscored: true

# 4. 重启后端
cd ~/Development/aicreatorvault
docker-compose restart backend
```

---

## 📖 相关文档

- [PostgreSQL Identifiers](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)
- [Sequelize Naming Conventions](https://sequelize.org/docs/v6/other-topics/naming-strategies/)

---

## 总结

**你的观察完全正确！** 使用驼峰格式确实需要双引号，这在 PostgreSQL 中不是标准做法。

但考虑到项目的一贯风格，**我建议保持驼峰格式**，以避免破坏性改动。

如果你更倾向于使用标准的 snake_case，我也可以帮你创建完整的迁移方案（包括重命名所有现有列）。

需要我帮你做决定或执行迁移吗？🤔

# Pre-commit 配置说明

> [English](../en/PRE-COMMIT-README.md)


## 概述
本项目使用 `.pre-commit` 来管理多语言的代码质量检查，支持 JavaScript、JSX 和 Python 文件。

## 配置的 Hooks

### 1. Prettier (JavaScript/JSX)
- **功能**: 代码格式化
- **支持文件**: `.js`, `.jsx`
- **配置**: 使用项目根目录的 `.prettierrc` 配置文件

### 2. ESLint (JavaScript/JSX)
- **功能**: 代码质量检查
- **支持文件**: `.js`, `.jsx`
- **配置**: 使用项目根目录的 `.eslintrc.json` 配置文件
- **自动修复**: 启用 `--fix` 参数自动修复可修复的问题

### 3. Black (Python)
- **功能**: Python 代码格式化
- **支持文件**: `.py`
- **配置**: 使用 Black 默认配置

### 4. Ruff (Python)
- **功能**: Python 代码检查和格式化
- **支持文件**: `.py`
- **自动修复**: 启用 `--fix` 参数自动修复可修复的问题

### 5. 通用检查
- **end-of-file-fixer**: 确保文件以换行符结束
- **trailing-whitespace**: 删除行尾空格
- **check-yaml**: 检查 YAML 语法
- **check-json**: 检查 JSON 语法
- **check-added-large-files**: 检查是否添加了大文件（>500KB）

### 6. 自定义检查
- **check-debug-statements**: 检查代码中是否包含调试语句（console.log, debugger, alert, TODO, FIXME）

## 安装和使用

### 首次安装
```bash
# 安装 pre-commit
pip install pre-commit

# 或者使用 uv（如果已安装）
uv tool install pre-commit

# 安装 hooks
npm run pre-commit:install
# 或者
pre-commit install --install-hooks
```

### 日常使用
```bash
# 提交代码时自动运行（配置在 .git/hooks/pre-commit）
git commit -m "your message"

# 手动运行所有检查
npm run pre-commit:run
# 或者
pre-commit run --all-files

# 运行特定 hook
pre-commit run prettier --all-files
pre-commit run eslint --all-files
pre-commit run black --all-files
```

### 跳过 pre-commit
```bash
# 跳过 pre-commit 检查
git commit --no-verify -m "skip pre-commit"
```

## 配置说明

### 文件排除
以下目录和文件被排除在检查之外：
- `node_modules/`
- `.venv/`
- `dist/`
- `build/`
- `__pycache__/`

### 项目结构
```
├── .pre-commit-config.yaml    # pre-commit 主配置文件
├── .pre-commit-hooks.yaml     # 自定义 hooks 定义
├── .eslintrc.json            # ESLint 配置
├── .prettierrc               # Prettier 配置
└── package.json              # 包含 pre-commit 相关脚本
```

## 故障排除

### 1. Hook 安装失败
```bash
# 清理缓存并重新安装
pre-commit clean
pre-commit install --install-hooks
```

### 2. Hook 运行失败
```bash
# 查看具体错误
pre-commit run --all-files -v

# 跳过失败的 hook
git commit --no-verify -m "message"
```

### 3. 更新 hooks
```bash
# 更新到最新版本
pre-commit autoupdate
```

### 4. Python 环境问题
确保 Python 环境已正确配置：
```bash
# 检查 Python 版本
python --version

# 检查 pre-commit 安装
pre-commit --version
```

## 开发说明

### 添加新的 Hook
1. 在 `.pre-commit-config.yaml` 中添加新的 repo 配置
2. 运行 `pre-commit install --install-hooks` 重新安装
3. 测试新 hook：`pre-commit run <hook-id> --all-files`

### 修改现有 Hook
1. 更新 `.pre-commit-config.yaml` 中的配置
2. 运行 `pre-commit install --install-hooks --overwrite` 重新安装
3. 测试修改：`pre-commit run --all-files`

### 禁用特定 Hook
在 `.pre-commit-config.yaml` 中注释掉不需要的 hook，或使用：
```bash
SKIP=hook-id git commit -m "message"
```

## 与旧 Husky 配置的对比

### 之前 (Husky)
- 只检查 JavaScript 文件
- 只运行 Prettier 格式化
- 不支持 Python 文件检查
- 配置分散在多个地方

### 现在 (Pre-commit)
- 支持多语言：JavaScript、JSX、Python
- 完整的代码质量检查链
- 统一的配置文件管理
- 更好的错误报告和调试
- 支持自动修复功能

## 性能优化
如果 hooks 运行太慢，可以考虑：
1. 使用缓存：pre-commit 会自动缓存结果
2. 排除大文件：在配置中排除不需要检查的文件
3. 并行运行：某些 hooks 支持并行执行

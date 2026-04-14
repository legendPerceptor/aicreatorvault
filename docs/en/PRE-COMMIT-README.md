# Pre-commit Configuration Guide

> [中文版](../zh/PRE-COMMIT-README.md)


## Overview
This project uses `.pre-commit` to manage multi-language code quality checks, supporting JavaScript, JSX, and Python files.

## Configured Hooks

### 1. Prettier (JavaScript/JSX)
- **Function**: Code formatting
- **Supported files**: `.js`, `.jsx`
- **Configuration**: Uses the `.prettierrc` config file in the project root

### 2. ESLint (JavaScript/JSX)
- **Function**: Code quality checking
- **Supported files**: `.js`, `.jsx`
- **Configuration**: Uses the `.eslintrc.json` config file in the project root
- **Auto-fix**: Enables `--fix` flag to automatically fix fixable issues

### 3. Black (Python)
- **Function**: Python code formatting
- **Supported files**: `.py`
- **Configuration**: Uses Black's default configuration

### 4. Ruff (Python)
- **Function**: Python code linting and formatting
- **Supported files**: `.py`
- **Auto-fix**: Enables `--fix` flag to automatically fix fixable issues

### 5. General Checks
- **end-of-file-fixer**: Ensures files end with a newline
- **trailing-whitespace**: Removes trailing whitespace
- **check-yaml**: Validates YAML syntax
- **check-json**: Validates JSON syntax
- **check-added-large-files**: Checks for large files being added (>500KB)

### 6. Custom Checks
- **check-debug-statements**: Checks for debug statements in code (console.log, debugger, alert, TODO, FIXME)

## Installation and Usage

### First-time Installation
```bash
# Install pre-commit
pip install pre-commit

# Or use uv (if installed)
uv tool install pre-commit

# Install hooks
npm run pre-commit:install
# Or
pre-commit install --install-hooks
```

### Daily Usage
```bash
# Automatically runs when committing code (configured in .git/hooks/pre-commit)
git commit -m "your message"

# Manually run all checks
npm run pre-commit:run
# Or
pre-commit run --all-files

# Run a specific hook
pre-commit run prettier --all-files
pre-commit run eslint --all-files
pre-commit run black --all-files
```

### Skip pre-commit
```bash
# Skip pre-commit checks
git commit --no-verify -m "skip pre-commit"
```

## Configuration Details

### File Exclusions
The following directories and files are excluded from checks:
- `node_modules/`
- `.venv/`
- `dist/`
- `build/`
- `__pycache__/`

### Project Structure
```
├── .pre-commit-config.yaml    # Pre-commit main configuration file
├── .pre-commit-hooks.yaml     # Custom hooks definition
├── .eslintrc.json            # ESLint configuration
├── .prettierrc               # Prettier configuration
└── package.json              # Contains pre-commit related scripts
```

## Troubleshooting

### 1. Hook Installation Failed
```bash
# Clean cache and reinstall
pre-commit clean
pre-commit install --install-hooks
```

### 2. Hook Execution Failed
```bash
# View detailed errors
pre-commit run --all-files -v

# Skip failed hooks
git commit --no-verify -m "message"
```

### 3. Update Hooks
```bash
# Update to latest version
pre-commit autoupdate
```

### 4. Python Environment Issues
Make sure the Python environment is properly configured:
```bash
# Check Python version
python --version

# Check pre-commit installation
pre-commit --version
```

## Development Notes

### Adding a New Hook
1. Add a new repo configuration in `.pre-commit-config.yaml`
2. Run `pre-commit install --install-hooks` to reinstall
3. Test the new hook: `pre-commit run <hook-id> --all-files`

### Modifying an Existing Hook
1. Update the configuration in `.pre-commit-config.yaml`
2. Run `pre-commit install --install-hooks --overwrite` to reinstall
3. Test the changes: `pre-commit run --all-files`

### Disabling a Specific Hook
Comment out the unwanted hook in `.pre-commit-config.yaml`, or use:
```bash
SKIP=hook-id git commit -m "message"
```

## Comparison with Old Husky Configuration

### Before (Husky)
- Only checked JavaScript files
- Only ran Prettier formatting
- No Python file checking support
- Configuration scattered in multiple places

### Now (Pre-commit)
- Multi-language support: JavaScript, JSX, Python
- Complete code quality check pipeline
- Unified configuration file management
- Better error reporting and debugging
- Auto-fix support

## Performance Optimization
If hooks are running too slowly, consider:
1. Use caching: pre-commit automatically caches results
2. Exclude large files: Exclude files that don't need checking in configuration
3. Parallel execution: Some hooks support parallel execution

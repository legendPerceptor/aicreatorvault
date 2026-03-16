# Image Service Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml ./

# Install dependencies using pip
RUN pip install --no-cache-dir \
    getdaft>=0.3.0 \
    ray>=2.9.0 \
    openai>=1.0.0 \
    fastapi>=0.109.0 \
    uvicorn>=0.27.0 \
    python-multipart>=0.0.6 \
    httpx>=0.26.0 \
    pydantic>=2.5.0 \
    pydantic-settings>=2.1.0 \
    numpy>=1.24.0 \
    pillow>=10.0.0 \
    python-dotenv>=1.0.0

# Copy source code
COPY . .

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Run the service
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]

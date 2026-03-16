-- Initialize pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for better vector search performance
-- This will be created automatically by the application if not exists
-- but we can pre-create it here for faster startup

-- Note: The Images table will be created by Sequelize migrations
-- This script just ensures pgvector is available

const { sequelize, DB_TYPE, supportsVector } = require('../models');
const { Op } = require('sequelize');

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecA[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function arrayToVectorString(arr) {
  if (!arr || !Array.isArray(arr)) return null;
  return '[' + arr.join(',') + ']';
}

async function findSimilarImagesByVector(queryEmbedding, limit = 10, threshold = 0.7) {
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
    return [];
  }

  if (DB_TYPE === 'postgres' && supportsVector()) {
    try {
      const vectorStr = arrayToVectorString(queryEmbedding);
      const results = await sequelize.query(
        `SELECT id, filename, path, description, score, "createdAt",
                1 - (embedding_vector <=> :vector::vector) as similarity
         FROM "Images"
         WHERE embedding_vector IS NOT NULL
         ORDER BY embedding_vector <=> :vector::vector
         LIMIT :limit`,
        {
          replacements: { vector: vectorStr, limit },
          type: sequelize.QueryTypes.SELECT,
        }
      );

      if (results.length > 0) {
        return results.filter((r) => r.similarity >= threshold);
      }
    } catch (err) {
      console.warn('[VectorSearch] pgvector search failed, falling back to JSON:', err.message);
    }
  }

  const { Image } = require('../models');
  const images = await Image.findAll({
    where: {
      embedding: { [Op.ne]: null },
    },
  });

  const similarities = images.map((image) => {
    const embedding = image.embedding;
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    return {
      id: image.id,
      filename: image.filename,
      path: image.path,
      description: image.description,
      score: image.score,
      createdAt: image.createdAt,
      similarity,
    };
  });

  return similarities
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

async function saveEmbeddingVector(imageId, embedding) {
  if (DB_TYPE !== 'postgres' || !supportsVector() || !embedding) {
    return false;
  }

  try {
    const vectorStr = arrayToVectorString(embedding);
    await sequelize.query(`UPDATE "Images" SET embedding_vector = :vector::vector WHERE id = :id`, {
      replacements: { vector: vectorStr, id: imageId },
    });
    return true;
  } catch (err) {
    console.warn('[VectorSearch] Failed to save embedding_vector:', err.message);
    return false;
  }
}

module.exports = {
  cosineSimilarity,
  arrayToVectorString,
  findSimilarImagesByVector,
  saveEmbeddingVector,
};

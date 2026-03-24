const { Image, Prompt } = require('../models');
const imageServiceClient = require('./imageServiceClient');

/**
 * 检索编排服务
 * 提供混合检索、结果重排序、查询优化等功能
 */
class RetrievalService {
  /**
   * 混合检索 - 结合关键词和语义搜索
   * @param {string} query - 搜索查询
   * @param {Object} options - 检索选项
   * @returns {Array} 检索结果
   */
  async hybridSearch(query, options = {}) {
    const {
      topK = 20,
      alpha = 0.7, // 语义搜索权重，0-1
      minScore = 0,
      maxScore = 10,
      minSimilarity = 0.5,
      themeIds = [],
      _includeUnanalyzed = true,
    } = options;

    // 并行执行关键词和语义搜索
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordSearch(query, { topK: topK * 2 }),
      this.semanticSearch(query, { topK: topK * 2 }),
    ]);

    // RRF融合
    const fusedResults = this.reciprocalRankFusion(keywordResults, semanticResults, alpha);

    // 应用过滤器
    const filtered = this.applyFilters(fusedResults, {
      minScore,
      maxScore,
      minSimilarity,
      themeIds,
    });

    // 重排序
    const reranked = this.rerankResults(filtered, query, {
      scoreWeight: 0.2,
      dateWeight: 0.1,
      similarityWeight: 0.7,
    });

    // 生成匹配原因
    const resultsWithReasons = await this.generateMatchReasons(reranked, query);

    return resultsWithReasons.slice(0, topK);
  }

  /**
   * 关键词搜索
   */
  async keywordSearch(query, options = {}) {
    const { topK = 20 } = options;

    const { Op } = require('sequelize');
    const results = await Image.findAll({
      where: {
        [Op.or]: [
          { description: { [Op.iLike]: `%${query}%` } },
          { '$Prompt.content$': { [Op.iLike]: `%${query}%` } },
          { filename: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: Prompt,
      limit: topK,
    });

    return results.map((img) => ({
      ...img.toJSON(),
      similarity: 0, // 关键词搜索不计算相似度
    }));
  }

  /**
   * 语义搜索
   */
  async semanticSearch(query, options = {}) {
    const { topK = 20 } = options;

    const images = await Image.findAll({ include: Prompt });
    const imagesWithEmbeddings = images
      .filter((img) => img.embedding)
      .map((img) => ({
        id: img.id,
        filename: img.filename,
        description: img.description,
        embedding: img.embedding,
        score: img.score,
        Prompt: img.Prompt,
      }));

    if (imagesWithEmbeddings.length === 0) {
      return [];
    }

    try {
      const results = await imageServiceClient.searchByText(query, imagesWithEmbeddings, topK);

      const resultIds = results.map((r) => r.id);
      const fullImages = await Image.findAll({
        where: { id: resultIds },
        include: Prompt,
      });

      const imageMap = new Map(fullImages.map((img) => [img.id, img]));

      return results
        .map((r) => {
          const img = imageMap.get(r.id);
          if (img) {
            return {
              ...img.toJSON(),
              similarity: r.similarity,
            };
          }
          return null;
        })
        .filter(Boolean);
    } catch (error) {
      console.error('语义搜索失败:', error);
      return [];
    }
  }

  /**
   * 以图搜图
   */
  async imageSearch(imageBuffer, filename, options = {}) {
    const { topK = 20 } = options;

    const images = await Image.findAll({ include: Prompt });
    const imagesWithEmbeddings = images
      .filter((img) => img.embedding)
      .map((img) => ({
        id: img.id,
        filename: img.filename,
        description: img.description,
        embedding: img.embedding,
        score: img.score,
      }));

    if (imagesWithEmbeddings.length === 0) {
      return [];
    }

    try {
      const results = await imageServiceClient.searchByImage(
        imageBuffer,
        filename,
        imagesWithEmbeddings,
        topK
      );

      const resultIds = results.map((r) => r.id);
      const fullImages = await Image.findAll({
        where: { id: resultIds },
        include: Prompt,
      });

      const imageMap = new Map(fullImages.map((img) => [img.id, img]));

      return results
        .map((r) => {
          const img = imageMap.get(r.id);
          if (img) {
            return {
              ...img.toJSON(),
              similarity: r.similarity,
            };
          }
          return null;
        })
        .filter(Boolean);
    } catch (error) {
      console.error('以图搜图失败:', error);
      return [];
    }
  }

  /**
   * Reciprocal Rank Fusion (RRF) 算法
   * 融合多个排序结果
   */
  reciprocalRankFusion(keywordResults, semanticResults, alpha = 0.7) {
    const k = 60; // RRF常数，通常设为60

    // 创建评分映射
    const scores = new Map();

    // 关键词排名分数
    keywordResults.forEach((item, index) => {
      const rank = index + 1;
      const score = (1 - alpha) * (1 / (k + rank));
      scores.set(item.id, { item, score: score + (scores.get(item.id)?.score || 0) });
    });

    // 语义排名分数
    semanticResults.forEach((item, index) => {
      const rank = index + 1;
      const score = alpha * (1 / (k + rank));
      const existing = scores.get(item.id);
      if (existing) {
        existing.score += score;
        // 保留相似度信息
        if (item.similarity !== undefined) {
          existing.item.similarity = item.similarity;
        }
      } else {
        scores.set(item.id, { item, score });
      }
    });

    // 按融合分数排序
    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map((v) => ({
        ...v.item,
        fusionScore: v.score,
      }));
  }

  /**
   * 应用过滤器
   */
  applyFilters(results, filters) {
    let filtered = [...results];

    // 评分过滤
    if (filters.minScore !== undefined || filters.maxScore !== undefined) {
      const minScore = filters.minScore ?? 0;
      const maxScore = filters.maxScore ?? 10;
      filtered = filtered.filter((img) => {
        const score = img.score || 0;
        return score >= minScore && score <= maxScore;
      });
    }

    // 相似度过滤
    if (filters.minSimilarity !== undefined) {
      filtered = filtered.filter((img) => {
        const similarity = img.similarity || 0;
        return similarity >= filters.minSimilarity;
      });
    }

    // 日期过滤
    if (filters.dateFrom) {
      filtered = filtered.filter((img) => {
        const imgDate = new Date(img.created_at);
        return imgDate >= new Date(filters.dateFrom);
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter((img) => {
        const imgDate = new Date(img.created_at);
        return imgDate <= new Date(filters.dateTo);
      });
    }

    // 主题过滤（需要查询主题关联）
    if (filters.themeIds && filters.themeIds.length > 0) {
      // TODO: 实现主题过滤
      // 需要查询 ThemeImage 关联表
    }

    return filtered;
  }

  /**
   * 重排序结果
   */
  rerankResults(results, query, weights = {}) {
    const { scoreWeight = 0.2, dateWeight = 0.1, similarityWeight = 0.7 } = weights;

    // 计算每个结果的综合分数
    const scored = results.map((item) => {
      let totalScore = 0;

      // 相似度分数（已归一化0-1）
      if (item.similarity !== undefined) {
        totalScore += item.similarity * similarityWeight;
      }

      // 评分分数（归一化到0-1）
      if (item.score !== undefined && item.score !== null) {
        totalScore += (item.score / 10) * scoreWeight;
      }

      // 日期分数（越新越好，归一化到0-1）
      if (item.created_at) {
        const daysSinceCreation =
          (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const dateScore = Math.max(0, 1 - daysSinceCreation / 365); // 一年内的图片有分数
        totalScore += dateScore * dateWeight;
      }

      return {
        ...item,
        rerankScore: totalScore,
      };
    });

    // 按重排序分数排序
    return scored.sort((a, b) => b.rerankScore - a.rerankScore);
  }

  /**
   * 生成匹配原因
   * 分析为什么这个结果匹配查询
   */
  async generateMatchReasons(results, query) {
    // 对于每个结果，提取匹配的关键特征
    return results.map((item) => {
      const reasons = [];

      // 相似度原因
      if (item.similarity >= 0.8) {
        reasons.push('高度相似的内容');
      } else if (item.similarity >= 0.6) {
        reasons.push('相似的视觉风格');
      }

      // 描述匹配
      if (item.description) {
        const queryLower = query.toLowerCase();
        const descLower = item.description.toLowerCase();

        // 提取描述中与查询相关的关键词
        const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
        const matchedWords = queryWords.filter((word) => descLower.includes(word));

        if (matchedWords.length > 0) {
          reasons.push(`包含关键词: ${matchedWords.slice(0, 2).join(', ')}`);
        }
      }

      // 提示词匹配
      if (item.Prompt?.content) {
        const queryLower = query.toLowerCase();
        const promptLower = item.Prompt.content.toLowerCase();

        if (promptLower.includes(queryLower)) {
          reasons.push('匹配的提示词');
        }
      }

      // 评分原因
      if (item.score >= 8) {
        reasons.push('高评分内容');
      }

      // 文件名匹配
      if (item.filename) {
        const queryLower = query.toLowerCase();
        const filenameLower = item.filename.toLowerCase();

        if (filenameLower.includes(queryLower)) {
          reasons.push('文件名匹配');
        }
      }

      return {
        ...item,
        matchReasons: reasons,
      };
    });
  }

  /**
   * 查询扩展
   * 扩展查询词以提高召回率
   */
  async expandQuery(query) {
    const expansions = [query];

    // 简单的同义词扩展（可以接入更复杂的词向量模型）
    const synonyms = {
      红: ['红色', '赤', '朱红'],
      蓝: ['蓝色', '天蓝', '深蓝'],
      绿: ['绿色', '翠绿', '青'],
      女孩: ['女性', '女子', '少女'],
      男孩: ['男性', '男子', '少年'],
      风景: ['景色', '景观', '山水'],
      肖像: ['人物', '头像', '特写'],
    };

    const queryLower = query.toLowerCase();
    for (const [term, syns] of Object.entries(synonyms)) {
      if (queryLower.includes(term)) {
        syns.forEach((syn) => {
          const expanded = query.replace(new RegExp(term, 'gi'), syn);
          if (expanded !== query) {
            expansions.push(expanded);
          }
        });
      }
    }

    return [...new Set(expansions)]; // 去重
  }

  /**
   * 查询优化
   * 清理和标准化查询
   */
  optimizeQuery(query) {
    if (!query || typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, '') // 移除特殊字符，保留中英文
      .toLowerCase();
  }
}

module.exports = new RetrievalService();

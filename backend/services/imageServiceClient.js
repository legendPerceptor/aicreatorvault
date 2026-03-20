const axios = require('axios');

const IMAGE_SERVICE_URL = process.env.IMAGE_SERVICE_URL || 'http://localhost:8001';

class ImageServiceClient {
  constructor() {
    this.client = axios.create({
      baseURL: IMAGE_SERVICE_URL,
      timeout: 60000,
    });
  }

  async analyzeImage(imagePath) {
    try {
      const response = await this.client.post('/analyze', {
        image_path: imagePath,
      });
      return response.data;
    } catch (error) {
      console.error('分析图片失败:', error.message);
      throw error;
    }
  }

  async analyzeUploadedImage(fileBuffer, filename) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, filename);

      const response = await this.client.post('/analyze/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('分析上传图片失败:', error.message);
      throw error;
    }
  }

  async searchByText(query, images, topK = 10) {
    try {
      const response = await this.client.post('/search/text', {
        query,
        images,
        top_k: topK,
      });
      return response.data.results;
    } catch (error) {
      console.error('文本搜索失败:', error.message);
      throw error;
    }
  }

  async searchByImage(fileBuffer, filename, images, topK = 10) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, filename);
      formData.append('images', JSON.stringify(images));
      formData.append('top_k', topK.toString());

      const response = await this.client.post('/search/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.results;
    } catch (error) {
      console.error('图片搜索失败:', error.message);
      throw error;
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.client.post('/embedding', null, {
        params: { text },
      });
      return response.data;
    } catch (error) {
      console.error('生成嵌入失败:', error.message);
      throw error;
    }
  }

  async batchProcess(directoryPath, extensions = null) {
    try {
      const response = await this.client.post('/batch', {
        directory_path: directoryPath,
        extensions,
      });
      return response.data.results;
    } catch (error) {
      console.error('批量处理失败:', error.message);
      throw error;
    }
  }

  async batchProcessPaths(imagePaths) {
    try {
      const response = await this.client.post('/batch-paths', {
        image_paths: imagePaths,
      });
      return response.data.results;
    } catch (error) {
      console.error('批量处理路径失败:', error.message);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // ============= Qdrant 向量搜索方法 =============

  /**
   * 检查 Qdrant 健康状态
   */
  async qdrantHealthCheck() {
    try {
      const response = await this.client.get('/qdrant/health');
      return response.data;
    } catch (error) {
      console.error('Qdrant 健康检查失败:', error.message);
      return { connected: false, status: 'error' };
    }
  }

  /**
   * 使用 Qdrant 进行向量搜索
   * @param {number[]} queryVector - 查询向量
   * @param {number} topK - 返回结果数量
   * @param {object} filters - 过滤条件
   * @returns {Promise<Array>} 搜索结果
   */
  async qdrantSearch(queryVector, topK = 20, filters = null) {
    try {
      const response = await this.client.post('/qdrant/search', {
        query_vector: queryVector,
        top_k: topK,
        filters: filters,
      });
      return response.data.results;
    } catch (error) {
      console.error('Qdrant 搜索失败:', error.message);
      throw error;
    }
  }

  /**
   * 插入或更新向量到 Qdrant
   * @param {number} imageId - 图片 ID
   * @param {number[]} embedding - 向量
   * @param {object} metadata - 元数据
   */
  async qdrantUpsert(imageId, embedding, metadata = null) {
    try {
      const response = await this.client.post('/qdrant/upsert', {
        image_id: imageId,
        embedding: embedding,
        metadata: metadata,
      });
      return response.data;
    } catch (error) {
      console.error('Qdrant 插入失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量插入向量到 Qdrant
   * @param {Array} points - 点数组 [{id, embedding, metadata}]
   */
  async qdrantBatchUpsert(points) {
    try {
      const response = await this.client.post('/qdrant/batch-upsert', {
        points: points,
      });
      return response.data;
    } catch (error) {
      console.error('Qdrant 批量插入失败:', error.message);
      throw error;
    }
  }

  /**
   * 从 Qdrant 删除向量
   * @param {number} imageId - 图片 ID
   */
  async qdrantDelete(imageId) {
    try {
      const response = await this.client.delete(`/qdrant/delete/${imageId}`);
      return response.data;
    } catch (error) {
      console.error('Qdrant 删除失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量删除向量
   * @param {number[]} imageIds - 图片 ID 数组
   */
  async qdrantBatchDelete(imageIds) {
    try {
      const response = await this.client.post('/qdrant/batch-delete', {
        image_ids: imageIds,
      });
      return response.data;
    } catch (error) {
      console.error('Qdrant 批量删除失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取 Qdrant 集合信息
   */
  async qdrantGetInfo() {
    try {
      const response = await this.client.get('/qdrant/info');
      return response.data.info;
    } catch (error) {
      console.error('获取 Qdrant 信息失败:', error.message);
      return null;
    }
  }
}

module.exports = new ImageServiceClient();

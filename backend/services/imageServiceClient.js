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
}

module.exports = new ImageServiceClient();

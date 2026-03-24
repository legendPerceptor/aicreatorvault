const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Image } = require('../models');

const router = express.Router();

// Brave Search API 配置
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';
const BRAVE_IMAGE_SEARCH_URL = 'https://api.search.brave.com/res/v1/images/search';
const IMAGE_SERVICE_URL = process.env.IMAGE_SERVICE_URL || '';

// 配置
const REFERENCE_SEARCH_ENABLED = process.env.REFERENCE_SEARCH_ENABLED !== 'false';
const REFERENCE_SEARCH_MAX_RESULTS = parseInt(process.env.REFERENCE_SEARCH_MAX_RESULTS) || 50;
const REFERENCE_DOWNLOAD_TIMEOUT = parseInt(process.env.REFERENCE_DOWNLOAD_TIMEOUT) || 15000;

// 搜索参考图
router.get('/search', async (req, res) => {
  try {
    if (!BRAVE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BRAVE_API_KEY 未配置',
      });
    }

    const { query, count = 20 } = req.query;

    const response = await axios.get(BRAVE_IMAGE_SEARCH_URL, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
      params: { q: query, count },
    });

    const results = response.data.results || response.data.value || [];
    res.json({
      success: true,
      results,
      total: response.data.total || 0,
    });
  } catch (error) {
    console.error('Brave Search error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Brave Search API 调用失败',
      details: error.response?.data || error.message,
    });
  }
});

// 下载单张图片到本地
router.post('/download', async (req, res) => {
  try {
    const { url, title, source, themeId, autoAnalyze = true } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    // 下载图片
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    const ext = url.split('.').pop() || 'jpg';
    const filename = `ref_${timestamp}_${uuid}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: REFERENCE_DOWNLOAD_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770 Safari/537.36',
      },
    });

    const buffer = Buffer.from(response.data, 'binary');
    fs.writeFileSync(filepath, buffer);

    // 自动分析图片（如果启用)
    let analysis = null;
    if (autoAnalyze && IMAGE_SERVICE_URL) {
      try {
        const analyzeResponse = await axios.post(`${IMAGE_SERVICE_URL}/analyze`, {
          image_path: filepath,
        });
        analysis = analyzeResponse.data;
      } catch (e) {
        console.error('Analysis failed for', filename);
      }
    }

    // 创建图片记录
    const image = await Image.create({
      filename,
      path: filepath,
      originalUrl: url,
      sourceName: source,
      title: title || '',
      isReference: true,
      description: analysis?.description || '',
      embedding: analysis?.embedding || null,
      width: analysis?.width,
      height: analysis?.height,
      themeId: themeId || null,
    });

    res.json({
      success: true,
      image,
      message: '图片下载并添加成功',
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      error: '下载图片失败',
      details: error.message,
    });
  }
});

// 批量下载图片
router.post('/batch-download', async (req, res) => {
  try {
    const { images, themeId } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Images array is required',
      });
    }

    const uploadsDir = path.join(__dirname, '../uploads');

    // 确保上传目录存在
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const results = {
      success: 0,
      failed: 0,
      images: [],
    };

    for (const img of images) {
      try {
        // 下载图片
        const timestamp = Date.now();
        const uuid = uuidv4().split('-')[0];
        const ext = img.url.split('.').pop() || 'jpg';
        const filename = `ref_${timestamp}_${uuid}.${ext}`;
        const filepath = path.join(uploadsDir, filename);

        const response = await axios.get(img.url, {
          responseType: 'arraybuffer',
          timeout: REFERENCE_DOWNLOAD_TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        });

        const buffer = Buffer.from(response.data, 'binary');
        fs.writeFileSync(filepath, buffer);

        // 自动分析图片
        let analysis = null;
        if (IMAGE_SERVICE_URL) {
          try {
            const analyzeResponse = await axios.post(`${IMAGE_SERVICE_URL}/analyze`, {
              image_path: filepath,
            });
            analysis = analyzeResponse.data;
          } catch (e) {
            console.error('Analysis failed for', filename);
          }
        }

        // 创建图片记录
        const image = await Image.create({
          filename,
          path: filepath,
          originalUrl: img.url,
          sourceName: img.source,
          title: img.title || '',
          isReference: true,
          description: analysis?.description || '',
          embedding: analysis?.embedding || null,
          width: analysis?.width,
          height: analysis?.height,
          themeId: themeId || null,
        });

        results.success++;
        results.images.push(image);
      } catch (error) {
        console.error('Download failed for', img.url);
        results.failed++;
      }
    }

    res.json({
      success: results.success,
      failed: results.failed,
      images: results.images,
      message: `成功下载 ${results.success} 张，失败 ${results.failed} 张`,
    });
  } catch (error) {
    console.error('Batch download error:', error);
    res.status(500).json({
      success: false,
      error: '批量下载失败',
    });
  }
});

module.exports = router;

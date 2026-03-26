const express = require('express');
const axios = require('axios');
// FormData unused
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Image } = require('../models');
const tunnel = require('tunnel');

const router = express.Router();

// Brave Search API 配置
const BRAVE_API_KEY = process.env.BRAVE_API_KEY || '';
const BRAVE_IMAGE_SEARCH_URL = 'https://api.search.brave.com/res/v1/images/search';
const IMAGE_SERVICE_URL = process.env.IMAGE_SERVICE_URL || '';

// SOCKS5 代理配置
const SOCKS_PROXY_HOST = process.env.SOCKS_PROXY_HOST || '127.0.0.1';
const SOCKS_PROXY_PORT = process.env.SOCKS_PROXY_PORT || '1080';
const socksAgent = tunnel.httpsOverHttp({
  proxy: {
    host: SOCKS_PROXY_HOST,
    port: parseInt(SOCKS_PROXY_PORT),
  },
});

// 配置
const _REFERENCE_SEARCH_ENABLED = process.env.REFERENCE_SEARCH_ENABLED !== 'false';
const _REFERENCE_SEARCH_MAX_RESULTS = parseInt(process.env.REFERENCE_SEARCH_MAX_RESULTS) || 50;
const REFERENCE_DOWNLOAD_TIMEOUT = parseInt(process.env.REFERENCE_DOWNLOAD_TIMEOUT) || 15000;

// 搜索参考图 (GET)
router.get('/search', async (req, res) => {
  try {
    if (!BRAVE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BRAVE_API_KEY 未配置',
      });
    }

    const { query, count = 20 } = req.query;
    await performSearch(query, count, res);
  } catch (error) {
    console.error('Brave Search error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Brave Search API 调用失败',
      details: error.response?.data || error.message,
    });
  }
});

// 搜索参考图 (POST)
router.post('/search', async (req, res) => {
  try {
    if (!BRAVE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'BRAVE_API_KEY 未配置',
      });
    }

    const { query, count = 20 } = req.body;
    await performSearch(query, count, res);
  } catch (error) {
    console.error('Brave Search error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Brave Search API 调用失败',
      details: error.response?.data || error.message,
    });
  }
});

// 下载缩略图到本地并返回本地路径
async function downloadThumbnailToLocal(thumbnailUrl, propertiesUrl, title, source) {
  try {
    const uploadsDir = path.join(__dirname, '../uploads/thumbnails');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    const filename = `thumb_${timestamp}_${uuid}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // 优先使用 propertiesUrl（原始图片直链），如果不可用则尝试 thumbnailUrl
    const urlToDownload = propertiesUrl || thumbnailUrl;
    const response = await axios.get(urlToDownload, {
      httpAgent: socksAgent,
      httpsAgent: socksAgent,
      responseType: 'arraybuffer',
      timeout: REFERENCE_DOWNLOAD_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770 Safari/537.36',
        Accept: 'image/*,*/*',
        Referer: 'https://search.brave.com/',
      },
    });
    fs.writeFileSync(filepath, Buffer.from(response.data, 'binary'));
    return `/uploads/thumbnails/${filename}`;
  } catch (error) {
    console.error('Thumbnail download error:', error.message);
    return thumbnailUrl; // 下载失败时返回原始URL
  }
}

// 实际搜索逻辑
async function performSearch(query, count, res) {
  try {
    const response = await axios.get(BRAVE_IMAGE_SEARCH_URL, {
      httpAgent: socksAgent,
      httpsAgent: socksAgent,
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
      params: { q: query, count },
    });

    const braveResults = response.data.results || response.data.value || [];

    // 下载缩略图到本地
    const results = await Promise.all(
      braveResults.map(async (img) => {
        const localThumb = await downloadThumbnailToLocal(
          img.thumbnail?.src,
          img.properties?.url,
          img.title,
          img.source
        );
        return {
          ...img,
          thumbnail: localThumb, // 直接返回字符串URL，而不是对象
        };
      })
    );

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
}

// 下载单张图片到本地
router.post('/download', async (req, res) => {
  try {
    const { url, title, source, theme_id, autoAnalyze = true } = req.body;

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
      httpAgent: socksAgent,
      httpsAgent: socksAgent,
      responseType: 'arraybuffer',
      timeout: REFERENCE_DOWNLOAD_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770 Safari/537.36',
        Accept: 'image/*,*/*',
        Referer: 'https://search.brave.com/',
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
      } catch (_e) {
        console.error('Analysis failed for', filename);
      }
    }

    // 创建图片记录
    const image = await Image.create({
      filename,
      path: filepath,
      original_url: url,
      source_name: source,
      title: title || '',
      is_reference: true,
      description: analysis?.description || '',
      embedding: analysis?.embedding || null,
      width: analysis?.width,
      height: analysis?.height,
      theme_id: theme_id || null,
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
    const { images, theme_id } = req.body;

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
          httpAgent: socksAgent,
          httpsAgent: socksAgent,
          responseType: 'arraybuffer',
          timeout: REFERENCE_DOWNLOAD_TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0',
            Accept: 'image/*,*/*',
            Referer: 'https://search.brave.com/',
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
          } catch (_e) {
            console.error('Analysis failed for', filename);
          }
        }

        // 创建图片记录
        const image = await Image.create({
          filename,
          path: filepath,
          original_url: img.url,
          source_name: img.source,
          title: img.title || '',
          is_reference: true,
          description: analysis?.description || '',
          embedding: analysis?.embedding || null,
          width: analysis?.width,
          height: analysis?.height,
          theme_id: theme_id || null,
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

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');

const pipeline = promisify(stream.pipeline);

const IMAGE_GEN_API_URL =
  process.env.IMAGE_GEN_API_URL || 'https://api.minimaxi.com/v1/image_generation';
const IMAGE_GEN_API_KEY = process.env.IMAGE_GEN_API_KEY || '';
const UPLOADS_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/uploads'
    : path.join(__dirname, '../uploads');

const TEMP_DIR =
  process.env.NODE_ENV === 'production' || process.env.DOCKER_ENV
    ? '/app/temp'
    : path.join(__dirname, '../temp');

class ImageGenerationClient {
  constructor() {
    this.client = axios.create({
      baseURL: IMAGE_GEN_API_URL,
      timeout: 120000,
    });
  }

  /**
   * Generate images from a text prompt using MiniMax API
   * @param {string} prompt - The text prompt for image generation
   * @param {object} options - Generation options
   * @param {number} [options.n=1] - Number of images to generate
   * @param {string} [options.aspect_ratio='1:1'] - Aspect ratio (e.g., "1:1", "16:9")
   * @param {string} [options.model='image-01'] - Model to use
   * @param {boolean} [options.prompt_optimizer=true] - Whether to use prompt optimizer
   * @returns {Promise<{images: Array<{localPath: string, url: string}>, prompt: string}>}
   */
  async generateImages(prompt, options = {}) {
    const { n = 1, aspect_ratio = '1:1', model = 'image-01', prompt_optimizer = true } = options;

    if (!IMAGE_GEN_API_KEY) {
      throw new Error('IMAGE_GEN_API_KEY is not configured');
    }

    // Call MiniMax API
    const response = await this.client.post(
      '',
      {
        model,
        prompt,
        aspect_ratio,
        response_format: 'url',
        n,
        prompt_optimizer,
      },
      {
        headers: {
          Authorization: `Bearer ${IMAGE_GEN_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;

    // Check for API error
    if (data.base_resp && data.base_resp.status_code !== 0) {
      throw new Error(`MiniMax API error: ${data.base_resp.status_msg}`);
    }

    if (!data.data || !data.data.image_urls || data.data.image_urls.length === 0) {
      throw new Error('No image URLs returned from API');
    }

    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    // Download images and save to temp
    const images = [];
    for (let i = 0; i < data.data.image_urls.length; i++) {
      const imageUrl = data.data.image_urls[i];
      const filename = `generated_${Date.now()}_${i + 1}.jpg`;
      const localPath = path.join(TEMP_DIR, filename);

      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'stream',
          timeout: 30000,
        });

        await pipeline(imageResponse.data, fs.createWriteStream(localPath));

        images.push({
          url: imageUrl,
          localPath: localPath,
          filename: filename,
        });

        console.log(`[ImageGeneration] Downloaded: ${filename}`);
      } catch (downloadError) {
        console.error(
          `[ImageGeneration] Failed to download image ${i + 1}:`,
          downloadError.message
        );
        throw new Error(`Failed to download generated image ${i + 1}: ${downloadError.message}`);
      }
    }

    return {
      images,
      prompt,
    };
  }
}

module.exports = new ImageGenerationClient();

const axios = require('axios');
const cheerio = require('cheerio');
const imageServiceClient = require('./imageServiceClient');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

class ResourceService {
  /**
   * Extract metadata from a web URL (og:title, og:description, og:image, etc.)
   */
  async extractWebLink(url) {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT },
        timeout: 15000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('title').text() ||
        $('h1').first().text() ||
        '';

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      const thumbnail =
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        '';

      const siteName = $('meta[property="og:site_name"]').attr('content') || '';

      // Extract main text content (strip scripts/styles, get body text)
      $('script, style, nav, footer, header, iframe').remove();
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

      return {
        title: title.trim(),
        content: description || bodyText.slice(0, 2000),
        thumbnail: this.resolveUrl(thumbnail, url),
        metadata: {
          siteName,
          description,
          contentType: response.headers['content-type'] || '',
        },
      };
    } catch (error) {
      console.error('[ResourceService] Web extraction failed:', error.message);
      return { title: url, content: '', thumbnail: '', metadata: { error: error.message } };
    }
  }

  /**
   * Extract metadata and subtitles from a YouTube URL
   */
  async extractYouTube(url) {
    const videoId = this.extractYouTubeId(url);
    const result = {
      title: '',
      content: '',
      thumbnail: '',
      metadata: { videoId, url },
    };

    if (!videoId) {
      result.metadata.error = 'Could not extract video ID';
      return result;
    }

    // Use noembed as a lightweight alternative for metadata
    try {
      const metaResp = await axios.get(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, {
        timeout: 10000,
      });
      const data = metaResp.data;
      result.title = data.title || '';
      result.thumbnail = data.thumbnail_url || '';
      result.metadata.authorName = data.author_name || '';
      result.metadata.provider = data.provider_name || 'YouTube';
    } catch (error) {
      console.error('[ResourceService] YouTube metadata failed:', error.message);
    }

    // Try to fetch subtitles via YouTube's timedtext API
    try {
      const subtitles = await this.fetchYouTubeSubtitles(videoId);
      if (subtitles) {
        result.content = subtitles;
        result.metadata.hasSubtitles = true;
      }
    } catch (error) {
      result.metadata.hasSubtitles = false;
    }

    // Fallback title
    if (!result.title) {
      result.title = `YouTube Video ${videoId}`;
    }

    return result;
  }

  /**
   * Generate embedding for resource content
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) return null;
    try {
      const result = await imageServiceClient.generateEmbedding(text.slice(0, 8000));
      return result.embedding || null;
    } catch (error) {
      console.error('[ResourceService] Embedding generation failed:', error.message);
      return null;
    }
  }

  /**
   * Process a resource after creation: extract content + generate embedding
   * Returns updated fields to persist
   */
  async processResource(resource) {
    const updates = {};
    let textForEmbedding = '';

    if (resource.resource_type === 'web_link' && resource.url) {
      const extracted = await this.extractWebLink(resource.url);
      updates.title = resource.title || extracted.title;
      updates.content = resource.content || extracted.content;
      updates.thumbnail = extracted.thumbnail;
      updates.metadata = { ...resource.metadata, ...extracted.metadata };
      textForEmbedding = [updates.title, updates.content].filter(Boolean).join('\n');
    }

    if (resource.resource_type === 'youtube' && resource.url) {
      const extracted = await this.extractYouTube(resource.url);
      updates.title = resource.title || extracted.title;
      updates.content = resource.content || extracted.content;
      updates.thumbnail = extracted.thumbnail;
      updates.metadata = { ...resource.metadata, ...extracted.metadata };
      textForEmbedding = [updates.title, updates.content].filter(Boolean).join('\n');
    }

    if (resource.resource_type === 'note') {
      textForEmbedding = [resource.title, resource.content].filter(Boolean).join('\n');
    }

    if (resource.resource_type === 'pdf' && resource.content) {
      textForEmbedding = [resource.title, resource.content].filter(Boolean).join('\n');
    }

    // Generate embedding if we have text
    if (textForEmbedding.trim()) {
      const embedding = await this.generateEmbedding(textForEmbedding);
      if (embedding) {
        updates.embedding = embedding;
      }
    }

    return updates;
  }

  // --- Private helpers ---

  extractYouTubeId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  async fetchYouTubeSubtitles(videoId) {
    // Fetch the watch page to get caption tracks
    const resp = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 10000,
    });

    // Extract caption track URL from ytInitialPlayerResponse
    const captionMatch = resp.data.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) return null;

    try {
      const tracks = JSON.parse(captionMatch[1]);
      // Prefer English, fall back to first available
      const track =
        tracks.find((t) => t.languageCode === 'en') ||
        tracks.find((t) => t.languageCode === 'zh') ||
        tracks[0];
      if (!track?.baseUrl) return null;

      const captionResp = await axios.get(track.baseUrl, { timeout: 10000 });
      const $ = cheerio.load(captionResp.data, { xmlMode: true });
      const text = $('text')
        .map((_, el) => $(el).text())
        .get()
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      return text.slice(0, 10000);
    } catch {
      return null;
    }
  }

  resolveUrl(src, baseUrl) {
    if (!src) return '';
    if (src.startsWith('http')) return src;
    try {
      return new URL(src, baseUrl).href;
    } catch {
      return src;
    }
  }
}

module.exports = new ResourceService();

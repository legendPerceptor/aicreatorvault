const axios = require('axios');
const cheerio = require('cheerio');
const { execFile } = require('child_process');
const imageServiceClient = require('./imageServiceClient');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Use undici ProxyAgent (built into Node 18+) for reliable proxy support
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.https_proxy ||
  process.env.http_proxy;

let undiciProxy = null;
if (proxyUrl) {
  try {
    const { ProxyAgent, fetch: undiciFetch } = require('undici');
    undiciProxy = new ProxyAgent(proxyUrl);
  } catch (_e) {
    // undici not available
  }
}

/**
 * Fetch URL content via proxy-aware HTTP client.
 * Uses undici (with ProxyAgent) in Docker, falls back to curl in WSL dev.
 */
async function fetchUrl(url, timeout = 15000) {
  // Try undici with proxy first (works in Docker containers)
  if (undiciProxy) {
    try {
      const { fetch: undiciFetch } = require('undici');
      const resp = await undiciFetch(url, {
        dispatcher: undiciProxy,
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(timeout),
      });
      return await resp.text();
    } catch (_e) {
      // undici failed, try curl fallback
    }
  }

  // Try axios without proxy (direct connection)
  try {
    const resp = await axios.get(url, {
      timeout,
      maxRedirects: 5,
      headers: { 'User-Agent': USER_AGENT },
    });
    return typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);
  } catch (_axiosErr) {
    // Fallback to curl (available in WSL dev environment)
    return new Promise((resolve, reject) => {
      const args = [
        '-sL',
        '--max-time',
        String(Math.floor(timeout / 1000)),
        '-H',
        `User-Agent: ${USER_AGENT}`,
        url,
      ];
      execFile('curl', args, { timeout, maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
        if (err) return reject(err);
        if (!stdout) return reject(new Error('curl returned empty response'));
        resolve(stdout);
      });
    });
  }
}

// JSON fetch using undici proxy or axios
async function fetchJson(url, timeout = 10000) {
  if (undiciProxy) {
    try {
      const { fetch: undiciFetch } = require('undici');
      const resp = await undiciFetch(url, {
        dispatcher: undiciProxy,
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(timeout),
      });
      return await resp.json();
    } catch (_e) {
      // undici failed
    }
  }
  const resp = await axios.get(url, { timeout, headers: { 'User-Agent': USER_AGENT } });
  return resp.data;
}

class ResourceService {
  /**
   * Extract metadata from a web URL (og:title, og:description, og:image, etc.)
   */
  async extractWebLink(url) {
    try {
      const html = await fetchUrl(url);

      const $ = cheerio.load(html);

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
        },
      };
    } catch (error) {
      console.error('[ResourceService] Web extraction failed:', error.message);
      return { title: url, content: '', thumbnail: '', metadata: { error: error.message } };
    }
  }

  /**
   * Extract metadata and subtitles from a YouTube URL
   * Uses YouTube Data API v3 if YOUTUBE_API_KEY is configured, falls back to noembed
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

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;

    if (youtubeApiKey) {
      // YouTube Data API v3 — full metadata + description
      try {
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${youtubeApiKey}`;
        const data = await fetchJson(apiUrl, 10000);
        const item = data?.items?.[0];
        if (item) {
          const snippet = item.snippet || {};
          const contentDetails = item.contentDetails || {};
          result.title = snippet.title || '';
          result.content = snippet.description || '';
          const thumbs = snippet.thumbnails || {};
          result.thumbnail =
            thumbs.maxres?.url ||
            thumbs.standard?.url ||
            thumbs.high?.url ||
            thumbs.default?.url ||
            '';
          result.metadata = {
            ...result.metadata,
            channelTitle: snippet.channelTitle || '',
            publishedAt: snippet.publishedAt || '',
            tags: snippet.tags || [],
            duration: contentDetails.duration || '',
            definition: contentDetails.definition || '',
            provider: 'YouTube',
          };
          return result;
        }
      } catch (error) {
        console.error('[ResourceService] YouTube Data API failed:', error.message);
      }
    }

    // Fallback: noembed for basic metadata
    try {
      const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
      const data = await fetchJson(noembedUrl, 10000);
      result.title = data.title || '';
      result.thumbnail = data.thumbnail_url || '';
      result.metadata.authorName = data.author_name || '';
      result.metadata.provider = data.provider_name || 'YouTube';
    } catch (error) {
      console.error('[ResourceService] YouTube noembed fallback failed:', error.message);
    }

    // Try to fetch subtitles via YouTube's timedtext API
    try {
      const subtitles = await this.fetchYouTubeSubtitles(videoId);
      if (subtitles) {
        // Use subtitles as content if no description was obtained
        if (!result.content) {
          result.content = subtitles;
        }
        result.metadata.hasSubtitles = true;
      }
    } catch (_error) {
      result.metadata.hasSubtitles = false;
    }

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
      // Use extracted title unless user provided a meaningful one (not the URL itself)
      updates.title =
        resource.title && resource.title !== resource.url ? resource.title : extracted.title;
      updates.content = resource.content || extracted.content;
      updates.thumbnail = extracted.thumbnail;
      updates.metadata = { ...resource.metadata, ...extracted.metadata };
      textForEmbedding = [updates.title, updates.content].filter(Boolean).join('\n');
    }

    if (resource.resource_type === 'youtube' && resource.url) {
      const extracted = await this.extractYouTube(resource.url);
      updates.title =
        resource.title && resource.title !== resource.url ? resource.title : extracted.title;
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
    const html = await fetchUrl(`https://www.youtube.com/watch?v=${videoId}`, 10000);

    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
    if (!captionMatch) return null;

    try {
      const tracks = JSON.parse(captionMatch[1]);
      const track =
        tracks.find((t) => t.languageCode === 'en') ||
        tracks.find((t) => t.languageCode === 'zh') ||
        tracks[0];
      if (!track?.baseUrl) return null;

      const captionXml = await fetchUrl(track.baseUrl, 10000);
      const $ = cheerio.load(captionXml, { xmlMode: true });
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

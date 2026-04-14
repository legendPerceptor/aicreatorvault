# Reference Image Search Feature Design Document

> [中文版](../zh/REFERENCE_SEARCH_DESIGN.md)


## Goals
Implement a "reference image search" feature in AI Creator Vault that allows users to:
1. Enter descriptions or keywords to search for reference images on the web
2. Preview and select images on the search results page
3. Download and add images to the local database with one click

## Technical Solution

### 1. Data Flow

```
User input → Brave Search API → Get image URL list → Frontend display → User selection → Download image → Add to database
```

### 2. Backend API Design

#### New Route: `/api/reference-search`

```javascript
// Search reference images
POST /api/reference-search/search
Body: { query: string, count: number }
Response: {
  results: [
    {
      thumbnail: string,    // Thumbnail URL
      originalUrl: string,  // Original image URL
      title: string,        // Image title
      source: string,       // Source website
      width: number,
      height: number
    }
  ]
}

// Download and add reference image to database
POST /api/reference-search/download
Body: {
  url: string,
  title: string,
  source: string,
  themeId?: number  // Optional, directly associate with theme
}
Response: {
  success: boolean,
  image: Image,     // Created image object
  message: string
}

// Batch download
POST /api/reference-search/batch-download
Body: {
  images: [{ url, title, source }],
  themeId?: number
}
Response: {
  success: number,
  failed: number,
  images: Image[]
}
```

### 3. Frontend Component Design

#### New Page: `ReferenceSearchPage.jsx`

```
┌─────────────────────────────────────────────────────────┐
│  🌐 Reference Image Search                               │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐    │
│  │ Search: Describe the reference image...  [Search]│    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Filters: [All] [Landscape] [Portrait] [Architecture]   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Search Results (20)         [Selected: 3] [Batch Add]  │
│                                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │              │
│  │     │ │  ✓  │ │     │ │  ✓  │ │     │              │
│  │[Add]│ │[Add]│ │[Add]│ │[Add]│ │[Add]│              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐              │
│  │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │ │ 🖼️ │              │
│  │  ✓  │ │     │ │     │ │     │ │     │              │
│  │[Add]│ │[Add]│ │[Add]│ │[Add]│ │[Add]│              │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘              │
│                                                         │
│  [Load More]                                            │
└─────────────────────────────────────────────────────────┘
```

#### Component List

1. **ReferenceSearchBox** - Search input box
2. **ReferenceSearchFilters** - Filters (optional)
3. **ReferenceSearchResults** - Search results grid
4. **ReferenceImageCard** - Individual search result card
5. **BatchAddModal** - Modal for batch adding to themes

### 4. Backend Implementation Details

#### 4.1 Brave Search Integration

```javascript
// backend/routes/referenceSearch.js

const axios = require('axios');

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/images/search';

async function searchImages(query, count = 20) {
  const response = await axios.get(BRAVE_SEARCH_URL, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY
    },
    params: {
      q: query,
      count: count,
      safesearch: 'moderate'
    }
  });

  return response.data.results || [];
}
```

#### 4.2 Image Download Service

```javascript
// backend/services/imageDownloader.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadImage(url, uploadsDir) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 10000
  });

  const filename = `ref_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
  const filepath = path.join(uploadsDir, filename);

  fs.writeFileSync(filepath, response.data);

  return {
    filename,
    filepath,
    size: response.data.length
  };
}
```

### 5. Database Model Extension

Add fields to the Image model:

```javascript
// Add to Image model
isReference: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
},
sourceUrl: {
  type: DataTypes.STRING,
  allowNull: true
},
sourceName: {
  type: DataTypes.STRING,
  allowNull: true
}
```

### 6. User Interaction Flow

1. **Search Phase**
   - User enters a description in the search box (e.g., "cyberpunk city night")
   - Click search, call Brave Image Search API
   - Display thumbnail grid

2. **Selection Phase**
   - User can click an image to preview the full-size version
   - Check the desired images
   - Optionally select which theme to add to

3. **Add Phase**
   - Single: Click "Add" button to download and add immediately
   - Batch: Select multiple images and click "Batch Add"
   - Download images in background, call existing image analysis service
   - Show success notification after completion

### 7. Error Handling

- Download failure: Show error, allow retry
- API rate limit: Show friendly message, suggest trying later
- Network issues: Timeout handling, display error message

### 8. Performance Optimization

- Thumbnail lazy loading
- Download queue management (avoid excessive concurrency)
- Progress display (for batch downloads)

### 9. Configuration

Add to `.env`:

```env
# Brave Search API
BRAVE_API_KEY=your_api_key

# Reference image search configuration
REFERENCE_SEARCH_ENABLED=true
REFERENCE_SEARCH_MAX_RESULTS=50
REFERENCE_DOWNLOAD_TIMEOUT=15000
```

## Implementation Plan

### Phase 1: Basic Features (1-2 days)
- [ ] Create backend route `referenceSearch.js`
- [ ] Implement Brave Search integration
- [ ] Implement image download service
- [ ] Create frontend page and basic components

### Phase 2: Interaction Optimization (1 day)
- [ ] Add full-size image preview
- [ ] Implement batch selection and download
- [ ] Add progress display
- [ ] Error handling and retry

### Phase 3: Advanced Features (Optional)
- [ ] Search history
- [ ] Favorite search results
- [ ] Auto-deduplication (check if already downloaded)
- [ ] Combine with AI analysis (analyze user intent before searching)

## API Pricing

Brave Search API free tier:
- 2,000 searches/month
- Suitable for personal use

For higher quotas:
- Basic: $5/month, 5,000 searches
- Pro: $50/month, 60,000 searches

import React from 'react';

function ReferenceSearchResults({
  results,
  selectedImages,
  downloadingIds,
  onToggleSelect,
  onDownload,
  isSearching,
}) {
  if (isSearching) {
    return (
      <div className="search-loading">
        <div className="loading-spinner"></div>
        <p>正在搜索图片...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-empty">
        <div className="empty-icon">🖼️</div>
        <h3>开始搜索参考图</h3>
        <p>输入关键词或描述，从网络搜索你想要的参考图片</p>
      </div>
    );
  }

  const isSelected = (image) => {
    return selectedImages.some((img) => img.url === image.url);
  };

  const isDownloading = (image) => {
    return downloadingIds.has(image.url);
  };

  return (
    <div className="reference-search-results">
      <div className="results-grid">
        {results.map((image, index) => (
          <div
            key={`${image.url}-${index}`}
            className={`result-card ${isSelected(image) ? 'selected' : ''}`}
          >
            <div className="image-wrapper">
              <img src={image.thumbnail} alt={image.title || 'Reference image'} loading="lazy" />
              <div className="image-overlay">
                <button
                  className="btn-preview"
                  onClick={() => window.open(image.url, '_blank')}
                  title="查看原图"
                >
                  🔗
                </button>
              </div>
            </div>

            <div className="card-info">
              {image.title && (
                <p className="card-title" title={image.title}>
                  {image.title.length > 40 ? image.title.slice(0, 40) + '...' : image.title}
                </p>
              )}
              {image.source && <p className="card-source">{image.source}</p>}
              {image.width && image.height && (
                <p className="card-size">
                  {image.width} × {image.height}
                </p>
              )}
            </div>

            <div className="card-actions">
              <button
                className={`btn-select ${isSelected(image) ? 'active' : ''}`}
                onClick={() => onToggleSelect(image)}
              >
                {isSelected(image) ? '✓ 已选' : '选择'}
              </button>
              <button
                className="btn-download"
                onClick={() => onDownload(image)}
                disabled={isDownloading(image)}
              >
                {isDownloading(image) ? '下载中...' : '添加'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReferenceSearchResults;

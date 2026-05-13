import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

function ReferenceSearchResults({
  results,
  selectedImages,
  downloadingIds,
  addedImageUrls = new Set(),
  onToggleSelect,
  onDownload,
  isSearching,
}) {
  const { t } = useTranslation();

  if (isSearching) {
    return (
      <div className="search-loading">
        <div className="loading-spinner"></div>
        <p>{t('referenceSearch.searchingImages')}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-empty">
        <div className="empty-icon">🖼️</div>
        <h3>{t('referenceSearch.startTitle')}</h3>
        <p>{t('referenceSearch.startDesc')}</p>
      </div>
    );
  }

  const isSelected = (image) => {
    return selectedImages.some((img) => img.url === image.url);
  };

  const isDownloading = (image) => {
    const imageUrl = image.properties?.url || image.url;
    return downloadingIds.has(imageUrl);
  };

  const isAdded = (image) => {
    const imageUrl = image.properties?.url || image.url;
    return addedImageUrls.has(imageUrl);
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
                  title={t('referenceSearch.viewOriginal')}
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
                {isSelected(image) ? t('referenceSearch.selected') : t('referenceSearch.select')}
              </button>
              <button
                className="btn-download"
                onClick={() => onDownload(image)}
                disabled={isDownloading(image) || isAdded(image)}
              >
                {isAdded(image)
                  ? t('referenceSearch.added') || '已添加'
                  : isDownloading(image)
                    ? t('referenceSearch.downloading')
                    : t('referenceSearch.add')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReferenceSearchResults;

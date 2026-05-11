import React, { useState } from 'react';
import ReferenceSearchBox from '../components/reference/ReferenceSearchBox';
import ReferenceSearchResults from '../components/reference/ReferenceSearchResults';
import BatchAddModal from '../components/reference/BatchAddModal';
import { useTranslation } from '../i18n/useTranslation';
import './ReferenceSearchPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function ReferenceSearchPage({
  themes = [],
  onImagesAdded,
  // 从 App 传入的持久化状态
  searchResults,
  onSearchResultsChange,
  selectedImages,
  onSelectedImagesChange,
  downloadingIds,
  onDownloadingIdsChange,
}) {
  const [isSearching, setIsSearching] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  // 搜索参考图
  const handleSearch = async (query) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    onSelectedImagesChange([]);

    try {
      const response = await fetch(`${API_BASE}/reference-search/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, count: 20 }),
      });

      const data = await response.json();

      if (data.success) {
        onSearchResultsChange(data.results);
      } else {
        setError(data.error || t('referenceSearch.searchFailed'));
      }
    } catch (err) {
      setError(t('referenceSearch.networkError'));
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // 选择/取消选择图片
  const toggleSelect = (image) => {
    onSelectedImagesChange((prev) => {
      const exists = prev.find((img) => img.url === image.url);
      if (exists) {
        return prev.filter((img) => img.url !== image.url);
      } else {
        return [...prev, image];
      }
    });
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedImages.length === searchResults.length) {
      onSelectedImagesChange([]);
    } else {
      onSelectedImagesChange([...searchResults]);
    }
  };

  // 下载单张图片
  const handleDownload = async (image) => {
    onDownloadingIdsChange((prev) => new Set([...prev, image.url]));

    try {
      const response = await fetch(`${API_BASE}/reference-search/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: image.url,
          title: image.title,
          source: image.source,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(t('referenceSearch.imageAdded'));
        if (onImagesAdded) onImagesAdded();
      } else {
        alert(t('referenceSearch.downloadFailed', { error: data.error }));
      }
    } catch (err) {
      alert(t('referenceSearch.downloadFailedRetry'));
      console.error('Download error:', err);
    } finally {
      onDownloadingIdsChange((prev) => {
        const newSet = new Set(prev);
        newSet.delete(image.url);
        return newSet;
      });
    }
  };

  // 批量下载
  const handleBatchDownload = async (themeId) => {
    setShowBatchModal(false);

    let success = 0;
    let failed = 0;

    for (const image of selectedImages) {
      try {
        const response = await fetch(`${API_BASE}/reference-search/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: image.url,
            title: image.title,
            source: image.source,
            themeId: themeId || null,
          }),
        });

        const data = await response.json();
        if (data.success) {
          success++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
      }
    }

    alert(t('referenceSearch.batchComplete', { success, failed }));
    onSelectedImagesChange([]);
    if (onImagesAdded) onImagesAdded();
  };

  return (
    <div className="reference-search-page">
      <div className="page-header">
        <h1>🌐 {t('referenceSearch.title')}</h1>
        <p className="page-description">{t('referenceSearch.description')}</p>
      </div>

      <ReferenceSearchBox onSearch={handleSearch} isSearching={isSearching} />

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>{t('common.close')}</button>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="results-toolbar">
          <div className="toolbar-left">
            <span className="results-count">
              {t('referenceSearch.foundImages', { count: searchResults.length })}
            </span>
            <button className="btn-select-all" onClick={toggleSelectAll}>
              {selectedImages.length === searchResults.length
                ? t('referenceSearch.deselectAll')
                : t('common.selectAll')}
            </button>
          </div>
          <div className="toolbar-right">
            {selectedImages.length > 0 && (
              <>
                <span className="selected-count">
                  {t('referenceSearch.selectedCount', { count: selectedImages.length })}
                </span>
                <button className="btn-batch-add" onClick={() => setShowBatchModal(true)}>
                  {t('referenceSearch.batchAdd')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <ReferenceSearchResults
        results={searchResults}
        selectedImages={selectedImages}
        downloadingIds={downloadingIds}
        onToggleSelect={toggleSelect}
        onDownload={handleDownload}
        isSearching={isSearching}
      />

      {showBatchModal && (
        <BatchAddModal
          themes={themes}
          selectedCount={selectedImages.length}
          onClose={() => setShowBatchModal(false)}
          onConfirm={handleBatchDownload}
        />
      )}
    </div>
  );
}

export default ReferenceSearchPage;

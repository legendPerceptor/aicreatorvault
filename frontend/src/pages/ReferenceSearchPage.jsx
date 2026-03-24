import React, { useState } from 'react';
import ReferenceSearchBox from '../components/reference/ReferenceSearchBox';
import ReferenceSearchResults from '../components/reference/ReferenceSearchResults';
import BatchAddModal from '../components/reference/BatchAddModal';
import './ReferenceSearchPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function ReferenceSearchPage({ themes = [], onImagesAdded }) {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [downloadingIds, setDownloadingIds] = useState(new Set());
  const [error, setError] = useState(null);

  // 搜索参考图
  const handleSearch = async (query) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setSelectedImages([]);

    try {
      const response = await fetch(`${API_BASE}/reference-search/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, count: 20 }),
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.results);
      } else {
        setError(data.error || '搜索失败');
      }
    } catch (err) {
      setError('网络错误，请检查服务是否正常运行');
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // 选择/取消选择图片
  const toggleSelect = (image) => {
    setSelectedImages((prev) => {
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
      setSelectedImages([]);
    } else {
      setSelectedImages([...searchResults]);
    }
  };

  // 下载单张图片
  const handleDownload = async (image) => {
    setDownloadingIds((prev) => new Set([...prev, image.url]));

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
        alert(`✓ 图片已添加到数据库`);
        if (onImagesAdded) onImagesAdded();
      } else {
        alert(`下载失败: ${data.error}`);
      }
    } catch (err) {
      alert('下载失败，请重试');
      console.error('Download error:', err);
    } finally {
      setDownloadingIds((prev) => {
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

    alert(`批量下载完成\n成功: ${success} 张\n失败: ${failed} 张`);
    setSelectedImages([]);
    if (onImagesAdded) onImagesAdded();
  };

  return (
    <div className="reference-search-page">
      <div className="page-header">
        <h1>🌐 参考图搜索</h1>
        <p className="page-description">从网络搜索参考图片，一键添加到你的素材库</p>
      </div>

      <ReferenceSearchBox onSearch={handleSearch} isSearching={isSearching} />

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="results-toolbar">
          <div className="toolbar-left">
            <span className="results-count">找到 {searchResults.length} 张图片</span>
            <button className="btn-select-all" onClick={toggleSelectAll}>
              {selectedImages.length === searchResults.length ? '取消全选' : '全选'}
            </button>
          </div>
          <div className="toolbar-right">
            {selectedImages.length > 0 && (
              <>
                <span className="selected-count">已选: {selectedImages.length} 张</span>
                <button className="btn-batch-add" onClick={() => setShowBatchModal(true)}>
                  批量添加
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

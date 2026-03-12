import React, { useState, useRef } from 'react';
import ImageCard from '../components/ImageCard';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function SearchPage({
  images,
  onDeleteImage,
  editingScores,
  scoreValues,
  onScoreEdit,
  onScoreChange,
  onScoreConfirm,
  onScoreCancel,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchMode, setSearchMode] = useState('keyword');
  const [isSearching, setIsSearching] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(null);
  const [searchImageFile, setSearchImageFile] = useState(null);
  const fileInputRef = useRef(null);

  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/images/service/status`);
      const data = await response.json();
      setServiceStatus(data.status);
    } catch (error) {
      setServiceStatus('error');
    }
  };

  React.useEffect(() => {
    checkServiceStatus();
  }, []);

  const handleKeywordSearch = (results) => {
    const filtered = images.filter(
      (image) => image.Prompt && image.Prompt.content.includes(searchQuery)
    );
    setSearchResults(filtered);
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_BASE}/images/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, topK: 20 }),
      });
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('语义搜索失败:', error);
      alert('语义搜索失败，请确保图像分析服务正在运行');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageSearch = async () => {
    if (!searchImageFile) return;

    setIsSearching(true);
    try {
      const formData = new FormData();
      formData.append('image', searchImageFile);
      formData.append('topK', '20');

      const response = await fetch(`${API_BASE}/images/search-by-image`, {
        method: 'POST',
        body: formData,
      });
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('以图搜图失败:', error);
      alert('以图搜图失败，请确保图像分析服务正在运行');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchMode === 'keyword') {
      handleKeywordSearch();
    } else if (searchMode === 'semantic') {
      handleSemanticSearch();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSearchImageFile(file);
    }
  };

  const handleImageSearchSubmit = (e) => {
    e.preventDefault();
    handleImageSearch();
  };

  return (
    <div className="section">
      <h2>检索参考</h2>

      <div className="service-status">
        <span>AI 服务状态: </span>
        <span
          className={`status-indicator ${
            serviceStatus === 'connected'
              ? 'status-connected'
              : serviceStatus === 'disconnected'
                ? 'status-disconnected'
                : 'status-unknown'
          }`}
        >
          {serviceStatus === 'connected'
            ? '已连接'
            : serviceStatus === 'disconnected'
              ? '未连接'
              : '检查中...'}
        </span>
        <button onClick={checkServiceStatus} className="btn-small">
          刷新
        </button>
      </div>

      <div className="search-mode-tabs">
        <button
          className={`tab-btn ${searchMode === 'keyword' ? 'active' : ''}`}
          onClick={() => setSearchMode('keyword')}
        >
          关键词搜索
        </button>
        <button
          className={`tab-btn ${searchMode === 'semantic' ? 'active' : ''}`}
          onClick={() => setSearchMode('semantic')}
        >
          AI 语义搜索
        </button>
        <button
          className={`tab-btn ${searchMode === 'image' ? 'active' : ''}`}
          onClick={() => setSearchMode('image')}
        >
          以图搜图
        </button>
      </div>

      {searchMode === 'keyword' && (
        <form onSubmit={handleSearch} className="form-group">
          <label htmlFor="search">搜索提示词：</label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="输入搜索关键词..."
          />
          <button type="submit">搜索</button>
        </form>
      )}

      {searchMode === 'semantic' && (
        <form onSubmit={handleSearch} className="form-group">
          <label htmlFor="semantic-search">AI 语义搜索：</label>
          <input
            type="text"
            id="semantic-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="描述你想找的图片内容，如：一个穿红衣服的女孩在公园里..."
          />
          <button type="submit" disabled={isSearching}>
            {isSearching ? '搜索中...' : 'AI 搜索'}
          </button>
          {serviceStatus !== 'connected' && (
            <p className="hint">提示：AI 语义搜索需要图像分析服务运行中</p>
          )}
        </form>
      )}

      {searchMode === 'image' && (
        <form onSubmit={handleImageSearchSubmit} className="form-group">
          <label htmlFor="image-search">以图搜图：</label>
          <input
            type="file"
            id="image-search"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
          />
          <button type="submit" disabled={isSearching || !searchImageFile}>
            {isSearching ? '搜索中...' : '搜索相似图片'}
          </button>
          {searchImageFile && <p className="hint">已选择: {searchImageFile.name}</p>}
        </form>
      )}

      <div className="search-results">
        <h3>
          搜索结果
          {searchResults.length > 0 && ` (${searchResults.length})`}
        </h3>
        {searchMode !== 'keyword' && searchResults.length > 0 && (
          <div className="results-info">
            <p>结果按相似度排序</p>
          </div>
        )}
        <div className="images-grid">
          {searchResults.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onDelete={onDeleteImage}
              editingScores={editingScores}
              scoreValues={scoreValues}
              onScoreEdit={onScoreEdit}
              onScoreChange={onScoreChange}
              onScoreConfirm={onScoreConfirm}
              onScoreCancel={onScoreCancel}
              showPromptEdit={false}
              showSimilarity={searchMode !== 'keyword'}
              similarity={image.similarity}
            />
          ))}
        </div>
        {searchResults.length === 0 && <p className="no-results">暂无搜索结果</p>}
      </div>
    </div>
  );
}

export default SearchPage;

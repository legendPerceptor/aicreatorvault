import React, { useState, useEffect, useRef } from 'react';
import ImageCard from '../components/ImageCard';
import SmartSearchBox from '../components/search/SmartSearchBox';
import SearchFilters from '../components/search/SearchFilters';
import SearchResultsToolbar from '../components/search/SearchResultsToolbar';
import { useTranslation } from '../i18n/useTranslation';
import './SearchPage.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

function SearchPage({
  images = [],
  onDeleteImage,
  editingScores,
  scoreValues,
  onScoreEdit,
  onScoreChange,
  onScoreConfirm,
  onScoreCancel,
  prompts = [],
  themes = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [serviceStatus, setServiceStatus] = useState('unknown');
  const [searchMode, setSearchMode] = useState('auto');
  const [sortBy, setSortBy] = useState('similarity');
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({});
  const [activeSearchType, setActiveSearchType] = useState('none'); // none | keyword | semantic | image | hybrid
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { t } = useTranslation();
  const checkServiceStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/images/service/status`);
      const data = await response.json();
      setServiceStatus(data.status);
    } catch (error) {
      setServiceStatus('error');
    }
  };

  useEffect(() => {
    checkServiceStatus();
  }, []);

  // 应用过滤器
  const applyFilters = (results, currentFilters) => {
    let filtered = [...results];

    // 评分过滤
    if (currentFilters.minScore !== undefined || currentFilters.maxScore !== undefined) {
      const minScore = currentFilters.minScore ?? 0;
      const maxScore = currentFilters.maxScore ?? 10;
      filtered = filtered.filter((img) => {
        const score = img.score || 0;
        return score >= minScore && score <= maxScore;
      });
    }

    // 相似度过滤
    if (currentFilters.minSimilarity !== undefined && currentFilters.minSimilarity > 0) {
      filtered = filtered.filter((img) => {
        const similarity = img.similarity || 0;
        return similarity >= currentFilters.minSimilarity;
      });
    }

    // 日期过滤
    if (currentFilters.dateFrom) {
      filtered = filtered.filter((img) => {
        const imgDate = new Date(img.createdAt);
        return imgDate >= new Date(currentFilters.dateFrom);
      });
    }

    if (currentFilters.dateTo) {
      filtered = filtered.filter((img) => {
        const imgDate = new Date(img.createdAt);
        return imgDate <= new Date(currentFilters.dateTo);
      });
    }

    // 主题过滤
    if (currentFilters.themeIds && currentFilters.themeIds.length > 0) {
      filtered = filtered.filter((img) => {
        // 假设图片有主题关联，这里需要根据实际数据结构调整
        return true; // 暂时跳过，需要实际的图片-主题关联数据
      });
    }

    return filtered;
  };

  // 排序结果
  const sortResults = (results, sortType) => {
    const sorted = [...results];

    switch (sortType) {
      case 'rerankScore':
        return sorted.sort((a, b) => (b.rerankScore || 0) - (a.rerankScore || 0));
      case 'similarity':
        return sorted.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
      case 'score':
        return sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      case 'date':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'name':
        return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
      default:
        return sorted;
    }
  };

  // 处理搜索
  const handleSearch = async (query, mode) => {
    if (!query && mode !== 'image') return;

    setIsSearching(true);
    setActiveSearchType(mode);

    try {
      let results = [];

      if (mode === 'keyword') {
        // 关键词搜索
        const filtered = images.filter((image) => {
          const matchesDescription = image.description?.toLowerCase().includes(query.toLowerCase());
          const matchesPrompt = image.Prompt?.content?.toLowerCase().includes(query.toLowerCase());
          return matchesDescription || matchesPrompt;
        });
        results = filtered;
        setActiveSearchType('keyword');
      } else if (mode === 'semantic') {
        // AI 语义搜索
        const response = await fetch(`${API_BASE}/images/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, topK: 50 }),
        });
        const data = await response.json();
        results = data.results || data;
        setActiveSearchType('semantic');
      } else if (mode === 'hybrid') {
        // 混合检索（关键词 + 语义）
        const response = await fetch(`${API_BASE}/images/search/hybrid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            topK: 50,
            alpha: 0.7, // 语义搜索权重
            minScore: filters.minScore,
            maxScore: filters.maxScore,
            minSimilarity: filters.minSimilarity,
            themeIds: filters.themeIds,
          }),
        });
        const data = await response.json();
        results = data.results || [];
        setActiveSearchType('hybrid');
      }

      // 应用过滤器和排序
      let processedResults = applyFilters(results, filters);
      processedResults = sortResults(processedResults, sortBy);

      setSearchResults(processedResults);
    } catch (error) {
      console.error('搜索失败:', error);
      alert(t('search.searchFailed', { error: error.message }));
    } finally {
      setIsSearching(false);
    }
  };

  // 处理图片搜索
  const handleImageSearch = async (file) => {
    setIsSearching(true);
    setActiveSearchType('image');

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('topK', '50');

      const response = await fetch(`${API_BASE}/images/search-by-image`, {
        method: 'POST',
        body: formData,
      });

      const results = await response.json();

      // 应用过滤器和排序
      let processedResults = applyFilters(results, filters);
      processedResults = sortResults(processedResults, sortBy);

      setSearchResults(processedResults);
    } catch (error) {
      console.error('以图搜图失败:', error);
      alert(t('search.imageSearchFailed'));
    } finally {
      setIsSearching(false);
    }
  };

  // 处理过滤器变化
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    // 如果有搜索结果，重新应用过滤器
    if (searchResults.length > 0) {
      let processed = applyFilters(searchResults, newFilters);
      processed = sortResults(processed, sortBy);
      setSearchResults(processed);
    }
  };

  // 处理排序变化
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);

    if (searchResults.length > 0) {
      const processed = sortResults(searchResults, newSortBy);
      setSearchResults(processed);
    }
  };

  // 清空搜索
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setActiveSearchType('none');
    setFilters({});
  };

  return (
    <div className="search-page">
      <div className="search-page-header">
        <h1>{t('search.title')}</h1>
        <p className="search-page-description">{t('search.description')}</p>
      </div>

      {/* 智能搜索框 */}
      <SmartSearchBox
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
        onImageUpload={handleImageSearch}
        isSearching={isSearching}
        serviceStatus={serviceStatus}
        placeholder={t('search.placeholder')}
      />

      {/* 过滤器 */}
      <SearchFilters themes={themes} initialFilters={filters} onFilterChange={handleFilterChange} />

      {/* 搜索结果 */}
      {(searchResults.length > 0 || activeSearchType !== 'none') && (
        <div className="search-results-section">
          {/* 工具栏 */}
          <SearchResultsToolbar
            resultCount={searchResults.length}
            searchMode={activeSearchType}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            viewMode={viewMode}
            onViewChange={setViewMode}
          />

          {/* 结果网格 */}
          {searchResults.length > 0 ? (
            <div className={`images-grid view-${viewMode}`}>
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
                  prompts={prompts}
                  showPromptEdit={false}
                  showSimilarity={activeSearchType === 'semantic' || activeSearchType === 'image'}
                  similarity={image.similarity}
                  matchReasons={image.matchReasons}
                  viewMode={viewMode}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <div className="no-results-icon">🔍</div>
              <h3>{t('search.noResults')}</h3>
              <p>{t('search.tryAdjusting')}</p>
              <button onClick={clearSearch} className="btn-clear-search">
                {t('search.clearSearch')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 初始状态提示 */}
      {activeSearchType === 'none' && (
        <div className="search-welcome">
          <div className="welcome-card">
            <div className="welcome-icon">🎨</div>
            <h2>{t('search.startSearch')}</h2>
            <div className="welcome-tips">
              <div className="tip">
                <span className="tip-icon">🔍</span>
                <div className="tip-content">
                  <strong>{t('search.keywordSearch')}</strong>
                  <p>{t('search.keywordSearchDesc')}</p>
                </div>
              </div>
              <div className="tip">
                <span className="tip-icon">🧠</span>
                <div className="tip-content">
                  <strong>{t('search.semanticSearch')}</strong>
                  <p>{t('search.semanticSearchDesc')}</p>
                </div>
              </div>
              <div className="tip">
                <span className="tip-icon">🖼️</span>
                <div className="tip-content">
                  <strong>{t('search.imageSearch')}</strong>
                  <p>{t('search.imageSearchDesc')}</p>
                </div>
              </div>
            </div>
            {serviceStatus !== 'connected' && (
              <div className="service-warning">
                <span className="warning-icon">⚠️</span>
                <span>{t('search.aiServiceDisconnected')}</span>
                <button onClick={checkServiceStatus} className="btn-reconnect">
                  {t('search.reconnect')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchPage;

import React, { useState } from 'react';

function SearchFilters({ onFilterChange, themes = [], initialFilters = {} }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState({
    minScore: 0,
    maxScore: 10,
    minSimilarity: 0.5,
    dateFrom: null,
    dateTo: null,
    themeIds: [],
    ...initialFilters,
  });

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const handleThemeToggle = (themeId) => {
    const newThemeIds = filters.themeIds.includes(themeId)
      ? filters.themeIds.filter((id) => id !== themeId)
      : [...filters.themeIds, themeId];

    handleFilterChange('themeIds', newThemeIds);
  };

  const resetFilters = () => {
    const defaultFilters = {
      minScore: 0,
      maxScore: 10,
      minSimilarity: 0.5,
      dateFrom: null,
      dateTo: null,
      themeIds: [],
    };
    setFilters(defaultFilters);
    onFilterChange?.(defaultFilters);
  };

  const hasActiveFilters = () => {
    return (
      filters.minScore > 0 ||
      filters.maxScore < 10 ||
      filters.minSimilarity > 0.5 ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.themeIds.length > 0
    );
  };

  return (
    <div className={`search-filters ${isExpanded ? 'expanded' : ''}`}>
      <div className="filters-header">
        <button type="button" className="filters-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          <span>筛选条件</span>
          {hasActiveFilters() && <span className="active-badge">已启用</span>}
        </button>

        {hasActiveFilters() && (
          <button type="button" className="reset-filters-btn" onClick={resetFilters}>
            重置
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="filters-content">
          {/* 评分过滤器 */}
          <div className="filter-group">
            <label className="filter-label">
              评分范围：{filters.minScore} - {filters.maxScore}
            </label>
            <div className="filter-range">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={filters.minScore}
                onChange={(e) => handleFilterChange('minScore', parseInt(e.target.value))}
                className="range-input"
              />
              <span className="range-separator">-</span>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={filters.maxScore}
                onChange={(e) => handleFilterChange('maxScore', parseInt(e.target.value))}
                className="range-input"
              />
            </div>
            <div className="range-values">
              <span>最低: {filters.minScore}⭐</span>
              <span>最高: {filters.maxScore}⭐</span>
            </div>
          </div>

          {/* 相似度过滤器 */}
          <div className="filter-group">
            <label className="filter-label">
              相似度阈值：{(filters.minSimilarity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={filters.minSimilarity}
              onChange={(e) => handleFilterChange('minSimilarity', parseFloat(e.target.value))}
              className="range-input full-width"
            />
            <div className="range-hint">
              只显示相似度高于 {(filters.minSimilarity * 100).toFixed(0)}% 的结果
            </div>
          </div>

          {/* 日期过滤器 */}
          <div className="filter-group">
            <label className="filter-label">日期范围</label>
            <div className="date-inputs">
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || null)}
                className="date-input"
                placeholder="开始日期"
              />
              <span className="date-separator">至</span>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || null)}
                className="date-input"
                placeholder="结束日期"
              />
            </div>
          </div>

          {/* 主题过滤器 */}
          {themes.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">主题</label>
              <div className="theme-tags">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-tag ${filters.themeIds.includes(theme.id) ? 'active' : ''}`}
                    onClick={() => handleThemeToggle(theme.id)}
                    title={theme.description}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchFilters;

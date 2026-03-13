import React from 'react';

function SearchResultsToolbar({
  resultCount = 0,
  searchMode = 'keyword',
  sortBy = 'similarity',
  onSortChange,
  viewMode = 'grid',
  onViewChange,
}) {
  const sortOptions = {
    semantic: [
      { value: 'similarity', label: '相似度' },
      { value: 'score', label: '评分' },
      { value: 'date', label: '日期' },
    ],
    keyword: [
      { value: 'score', label: '评分' },
      { value: 'date', label: '日期' },
      { value: 'name', label: '名称' },
    ],
    image: [
      { value: 'similarity', label: '相似度' },
      { value: 'score', label: '评分' },
      { value: 'date', label: '日期' },
    ],
  };

  const currentSortOptions = sortOptions[searchMode] || sortOptions.keyword;

  return (
    <div className="search-results-toolbar">
      {/* 结果计数 */}
      <div className="results-count">
        <span className="count-number">{resultCount}</span>
        <span className="count-label">{resultCount === 1 ? '个结果' : '个结果'}</span>
        {searchMode !== 'keyword' && (
          <span className="search-mode-indicator">
            ({searchMode === 'semantic' ? 'AI 语义' : '以图搜图'})
          </span>
        )}
      </div>

      <div className="toolbar-actions">
        {/* 排序选择器 */}
        <div className="sort-selector">
          <label htmlFor="sort-select" className="sort-label">
            排序：
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange?.(e.target.value)}
            className="sort-select"
          >
            {currentSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* 视图切换器 */}
        <div className="view-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewChange?.('grid')}
            title="网格视图"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 2h6v6H2V2zm0 8h6v6H2v-6zm8-8h6v6h-6V2zm0 8h6v6h-6v-6z" />
            </svg>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewChange?.('list')}
            title="列表视图"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 4h16v2H2V4zm0 5h16v2H2V9zm0 5h16v2H2v-2z" />
            </svg>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => onViewChange?.('compact')}
            title="紧凑视图"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 2h4v4H2V2zm6 0h4v4H8V2zm6 0h4v4h-4V2zM2 8h4v4H2V8zm6 0h4v4H8V8zm6 0h4v4h-4V8zM2 14h4v4H2v-4zm6 0h4v4H8v-4zm6 0h4v4h-4v-4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchResultsToolbar;

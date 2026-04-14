import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

function SearchResultsToolbar({
  resultCount = 0,
  searchMode = 'keyword',
  sortBy = 'similarity',
  onSortChange,
  viewMode = 'grid',
  onViewChange,
}) {
  const { t } = useTranslation();

  const sortOptions = {
    semantic: [
      { value: 'similarity', label: t('searchToolbar.similarity') },
      { value: 'score', label: t('searchToolbar.score') },
      { value: 'date', label: t('searchToolbar.date') },
    ],
    keyword: [
      { value: 'score', label: t('searchToolbar.score') },
      { value: 'date', label: t('searchToolbar.date') },
      { value: 'name', label: t('searchToolbar.name') },
    ],
    image: [
      { value: 'similarity', label: t('searchToolbar.similarity') },
      { value: 'score', label: t('searchToolbar.score') },
      { value: 'date', label: t('searchToolbar.date') },
    ],
    hybrid: [
      { value: 'rerankScore', label: t('searchToolbar.rerankScore') },
      { value: 'similarity', label: t('searchToolbar.similarity') },
      { value: 'score', label: t('searchToolbar.score') },
      { value: 'date', label: t('searchToolbar.date') },
    ],
  };

  const currentSortOptions = sortOptions[searchMode] || sortOptions.keyword;

  return (
    <div className="search-results-toolbar">
      <div className="results-count">
        <span className="count-number">{resultCount}</span>
        <span className="count-label">{resultCount === 1 ? t('searchToolbar.result') : t('searchToolbar.results')}</span>
        {searchMode !== 'keyword' && (
          <span className="search-mode-indicator">
            {searchMode === 'semantic'
              ? t('searchToolbar.semantic')
              : searchMode === 'hybrid'
                ? t('searchToolbar.hybrid')
                : searchMode === 'image'
                  ? t('searchToolbar.image')
                  : ''}
          </span>
        )}
      </div>

      <div className="toolbar-actions">
        <div className="sort-selector">
          <label htmlFor="sort-select" className="sort-label">
            {t('searchToolbar.sort')}
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

        <div className="view-toggle">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewChange?.('grid')}
            title={t('searchToolbar.gridView')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 2h6v6H2V2zm0 8h6v6H2v-6zm8-8h6v6h-6V2zm0 8h6v6h-6v-6z" />
            </svg>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewChange?.('list')}
            title={t('searchToolbar.listView')}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 4h16v2H2V4zm0 5h16v2H2V9zm0 5h16v2H2v-2z" />
            </svg>
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'compact' ? 'active' : ''}`}
            onClick={() => onViewChange?.('compact')}
            title={t('searchToolbar.compactView')}
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

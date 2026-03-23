import React, { useState } from 'react';

function ReferenceSearchBox({ onSearch, isSearching }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isSearching) {
      onSearch(query);
    }
  };

  const suggestions = [
    'cyberpunk city night',
    'fantasy landscape mountains',
    'anime character portrait',
    'steampunk mechanical',
    'watercolor nature',
  ];

  return (
    <div className="reference-search-box">
      <form onSubmit={handleSubmit}>
        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="描述你想要的参考图，如：cyberpunk city night, neon lights..."
            disabled={isSearching}
          />
          <button type="submit" disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <>
                <span className="spinner"></span>
                搜索中...
              </>
            ) : (
              '🔍 搜索'
            )}
          </button>
        </div>
      </form>

      <div className="search-suggestions">
        <span className="suggestion-label">试试这些：</span>
        {suggestions.map((s) => (
          <button
            key={s}
            className="suggestion-chip"
            onClick={() => {
              setQuery(s);
              onSearch(s);
            }}
            disabled={isSearching}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ReferenceSearchBox;

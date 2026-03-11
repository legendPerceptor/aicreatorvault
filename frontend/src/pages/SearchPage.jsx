import React, { useState } from 'react';
import ImageCard from '../components/ImageCard';

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

  const handleSearch = (e) => {
    e.preventDefault();
    const results = images.filter(
      (image) => image.Prompt && image.Prompt.content.includes(searchQuery)
    );
    setSearchResults(results);
  };

  return (
    <div className="section">
      <h2>检索参考</h2>
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
      <div className="search-results">
        <h3>搜索结果</h3>
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
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default SearchPage;

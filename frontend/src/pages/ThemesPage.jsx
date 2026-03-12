import React, { useState } from 'react';
import { SimpleImageCard } from '../components/ImageCard';

function ThemesPage({
  themes,
  images,
  selectedTheme,
  onSelectTheme,
  onAddTheme,
  onAddImageToTheme,
  onRemoveImageFromTheme,
}) {
  const [newTheme, setNewTheme] = useState({ name: '', description: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTheme.name.trim()) return;
    await onAddTheme(newTheme.name, newTheme.description);
    setNewTheme({ name: '', description: '' });
  };

  const handleCloseTheme = () => {
    onSelectTheme(null);
  };

  return (
    <div className="section">
      <h2>主题管理</h2>
      <form onSubmit={handleSubmit} className="form-group">
        <label htmlFor="themeName">主题名称：</label>
        <input
          type="text"
          id="themeName"
          value={newTheme.name}
          onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
        />
        <label htmlFor="themeDescription">主题描述：</label>
        <textarea
          id="themeDescription"
          value={newTheme.description}
          onChange={(e) => setNewTheme({ ...newTheme, description: e.target.value })}
          placeholder="输入主题描述..."
        />
        <button type="submit">创建主题</button>
      </form>
      <div className="themes-list">
        {themes.map((theme) => (
          <div key={theme.id} className="theme-card">
            <h3>{theme.name}</h3>
            <p className="description">{theme.description}</p>
            <button onClick={() => onSelectTheme(theme)}>查看详情</button>
          </div>
        ))}
      </div>
      {selectedTheme && (
        <div className="theme-images">
          <div className="theme-header">
            <h3>{selectedTheme.name} - 主题内包含图片</h3>
            <button className="close-btn" onClick={handleCloseTheme}>
              关闭
            </button>
          </div>
          <div className="images-grid">
            {selectedTheme.Images &&
              selectedTheme.Images.map((image) => (
                <SimpleImageCard
                  key={image.id}
                  image={image}
                  onDelete={() => onRemoveImageFromTheme(selectedTheme.id, image.id)}
                />
              ))}
          </div>
          <h4>从下方图片选择添加到主题</h4>
          <div className="images-grid">
            {images
              .filter((image) => {
                return (
                  !selectedTheme.Images || !selectedTheme.Images.some((img) => img.id === image.id)
                );
              })
              .map((image) => (
                <SimpleImageCard
                  key={image.id}
                  image={image}
                  onAddToTheme={() => onAddImageToTheme(selectedTheme.id, image.id)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemesPage;

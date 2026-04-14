import React, { useState } from 'react';
import { SimpleImageCard } from '../components/ImageCard';
import { useTranslation } from '../i18n/useTranslation';

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
  const { t } = useTranslation();

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
      <h2>{t('themes.title')}</h2>
      <form onSubmit={handleSubmit} className="form-group">
        <label htmlFor="themeName">{t('themes.themeName')}</label>
        <input
          type="text"
          id="themeName"
          value={newTheme.name}
          onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
        />
        <label htmlFor="themeDescription">{t('themes.themeDescription')}</label>
        <textarea
          id="themeDescription"
          value={newTheme.description}
          onChange={(e) => setNewTheme({ ...newTheme, description: e.target.value })}
          placeholder={t('themes.themeDescPlaceholder')}
        />
        <button type="submit">{t('themes.createTheme')}</button>
      </form>
      <div className="themes-list">
        {themes.map((theme) => (
          <div key={theme.id} className="theme-card">
            <h3>{theme.name}</h3>
            <p className="description">{theme.description}</p>
            <button onClick={() => onSelectTheme(theme)}>{t('themes.viewDetails')}</button>
          </div>
        ))}
      </div>
      {selectedTheme && (
        <div className="theme-images">
          <div className="theme-header">
            <h3>{t('themes.themeImages', { name: selectedTheme.name })}</h3>
            <button className="close-btn" onClick={handleCloseTheme}>
              {t('themes.close')}
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
          <h4>{t('themes.selectToAdd')}</h4>
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

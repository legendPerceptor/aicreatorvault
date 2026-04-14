import React, { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';

function ImageGenerationPanel({
  onGenerate,
  onSavePromptAndImages,
  onSaveImagesOnly,
  onSavePromptOnly,
  prompts,
  unusedPrompts,
  onClose,
}) {
  const [prompt, setPrompt] = useState('');
  const [n, setN] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generating, setGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState({});
  const [saving, setSaving] = useState(false);
  const [linkToPromptId, setLinkToPromptId] = useState('');
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const aspectRatioOptions = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'];

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerating(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedImages({});

    try {
      const result = await onGenerate({ prompt, n, aspect_ratio: aspectRatio });
      // Initialize all images as selected
      const selections = {};
      result.images.forEach((_, index) => {
        selections[index] = true;
      });
      setGeneratedImages(result.images);
      setSelectedImages(selections);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleImageSelection = (index) => {
    setSelectedImages((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const selectAll = () => {
    const all = {};
    generatedImages.forEach((_, index) => {
      all[index] = true;
    });
    setSelectedImages(all);
  };

  const deselectAll = () => {
    setSelectedImages({});
  };

  const handleSave = async (mode) => {
    const selectedIndices = Object.entries(selectedImages)
      .filter(([, selected]) => selected)
      .map(([index]) => parseInt(index));

    if (selectedIndices.length === 0 && mode !== 'prompt-only') {
      alert(t('imageGeneration.selectAtLeastOne'));
      return;
    }

    setSaving(true);
    try {
      const imagesToSave = selectedIndices.map((index) => generatedImages[index]);

      if (mode === 'prompt-and-images') {
        await onSavePromptAndImages(prompt, imagesToSave, linkToPromptId || null);
      } else if (mode === 'images-only') {
        await onSaveImagesOnly(imagesToSave, linkToPromptId || null);
      } else if (mode === 'prompt-only') {
        await onSavePromptOnly(prompt);
      }

      // Reset and close
      setPrompt('');
      setGeneratedImages([]);
      setSelectedImages({});
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content image-generation-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('imageGeneration.title')}</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!generatedImages.length ? (
          // Generation form
          <form onSubmit={handleGenerate} className="generation-form">
            <div className="form-group">
              <label htmlFor="gen-prompt">{t('imageGeneration.promptLabel')}</label>
              <textarea
                id="gen-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('imageGeneration.promptPlaceholder')}
                rows={4}
                disabled={generating}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="gen-n">{t('imageGeneration.countLabel')}</label>
                <select
                  id="gen-n"
                  value={n}
                  onChange={(e) => setN(parseInt(e.target.value))}
                  disabled={generating}
                >
                  {[1, 2, 3, 4].map((num) => (
                    <option key={num} value={num}>
                      {t('imageGeneration.countUnit', { n: num })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="gen-ratio">{t('imageGeneration.aspectRatio')}</label>
                <select
                  id="gen-ratio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  disabled={generating}
                >
                  {aspectRatioOptions.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="generate-btn" disabled={generating || !prompt.trim()}>
              {generating ? t('imageGeneration.generating') : t('imageGeneration.generate')}
            </button>
          </form>
        ) : (
          // Generated images preview and save options
          <div className="preview-section">
            <div className="preview-header">
              <p>{t('imageGeneration.generated', { count: generatedImages.length })}</p>
              <div className="selection-actions">
                <button type="button" onClick={selectAll}>
                  {t('common.selectAll')}
                </button>
                <button type="button" onClick={deselectAll}>
                  {t('common.deselectAll')}
                </button>
              </div>
            </div>

            <div className="generated-images-grid">
              {generatedImages.map((image, index) => (
                <div
                  key={index}
                  className={`generated-image-card ${selectedImages[index] ? 'selected' : ''}`}
                  onClick={() => toggleImageSelection(index)}
                >
                  <img src={`/uploads/${image.filename}`} alt={t('imageGeneration.generatedImageAlt', { index: index + 1 })} />
                  <div className="image-overlay">
                    <span>{selectedImages[index] ? t('imageGeneration.selected') : t('imageGeneration.clickToSelect')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="save-options">
              <h4>{t('imageGeneration.saveOptions')}</h4>

              <div className="form-group">
                <label htmlFor="link-prompt">{t('imageGeneration.linkExistingPrompt')}</label>
                <select
                  id="link-prompt"
                  value={linkToPromptId}
                  onChange={(e) => setLinkToPromptId(e.target.value)}
                >
                  <option value="">{t('imageGeneration.noLink')}</option>
                  {unusedPrompts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.content.substring(0, 50)}...
                    </option>
                  ))}
                </select>
              </div>

              <div className="save-buttons">
                <button
                  className="save-btn save-prompt-images"
                  onClick={() => handleSave('prompt-and-images')}
                  disabled={saving}
                >
                  {saving ? t('imageGeneration.saving') : t('imageGeneration.savePromptAndImages')}
                </button>
                <button
                  className="save-btn save-images"
                  onClick={() => handleSave('images-only')}
                  disabled={saving}
                >
                  {t('imageGeneration.saveImagesOnly')}
                </button>
                <button
                  className="save-btn save-prompt"
                  onClick={() => handleSave('prompt-only')}
                  disabled={saving}
                >
                  {t('imageGeneration.savePromptOnly')}
                </button>
              </div>
            </div>

            <button
              type="button"
              className="back-btn"
              onClick={() => {
                setGeneratedImages([]);
                setSelectedImages({});
              }}
            >
              {t('imageGeneration.regenerate')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ImageGenerationPanel;

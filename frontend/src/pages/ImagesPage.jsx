import React, { useState } from 'react';
import ImageCard from '../components/ImageCard';
import ImagePreviewModal from '../components/ImagePreviewModal';
import { useTranslation } from '../i18n/useTranslation';

function ImagesPage({
  images,
  prompts,
  unusedPrompts,
  onUploadImage,
  onDeleteImage,
  onUpdateImagePrompt,
  onUpdateImageScore,
  onAnalyzeSingleImage,
  analyzingImageId,
  editingScores,
  scoreValues,
  onScoreEdit,
  onScoreChange,
  onScoreConfirm,
  onScoreCancel,
  onBatchAnalyze,
  batchAnalyzing,
  batchProgress,
  analyzedFilter,
  onAnalyzedFilterChange,
  onGenerateImages,
  onSavePendingImages,
  onDiscardPendingImages,
  pendingImages,
  isGeneratingImages,
  isSavingPending,
}) {
  const { t } = useTranslation();
  const [draggedImage, setDraggedImage] = useState(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [showPromptSelection, setShowPromptSelection] = useState(false);
  const [editingImagePrompt, setEditingImagePrompt] = useState(null);
  const [selectedImagePromptId, setSelectedImagePromptId] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [showGenerationForm, setShowGenerationForm] = useState(false);
  const [genAutoAnalyze, setGenAutoAnalyze] = useState(true);
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [generationN, setGenerationN] = useState(1);
  const [generationAspectRatio, setGenerationAspectRatio] = useState('1:1');
  const [selectedPendingImages, setSelectedPendingImages] = useState({});
  const [pendingPreview, setPendingPreview] = useState(null);

  const aspectRatioOptions = ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'];

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!generationPrompt.trim()) return;
    await onGenerateImages({
      prompt: generationPrompt,
      n: generationN,
      aspect_ratio: generationAspectRatio,
      autoAnalyze: genAutoAnalyze,
    });
    const all = {};
    (pendingImages || []).forEach((_, i) => {
      all[i] = true;
    });
    setSelectedPendingImages(all);
  };

  const togglePendingImage = (index) => {
    setSelectedPendingImages((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSavePending = async (saveMode) => {
    const selectedIndices = Object.entries(selectedPendingImages)
      .filter(([, v]) => v)
      .map(([i]) => parseInt(i));
    const imgs = (pendingImages || []).filter((_, i) => selectedIndices.includes(i));
    await onSavePendingImages(imgs, generationPrompt, saveMode, genAutoAnalyze);
    setSelectedPendingImages({});
    setGenerationPrompt('');
    setShowGenerationForm(false);
  };

  const handleDiscardPending = () => {
    onDiscardPendingImages();
    setSelectedPendingImages({});
    setGenerationPrompt('');
    setShowGenerationForm(false);
  };

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    if (!autoAnalyze) {
      formData.set('autoAnalyze', 'false');
    }

    await onUploadImage(formData);
    e.target.reset();
    setAutoAnalyze(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setDraggedImage(files[0]);
      setSelectedPromptId('');
      setShowPromptSelection(true);
    }
  };

  const handleStagedImageUpload = async (e) => {
    e.preventDefault();
    if (!draggedImage) return;

    const formData = new FormData();
    formData.append('image', draggedImage);
    if (selectedPromptId) {
      formData.append('promptId', selectedPromptId);
    }
    formData.append('autoAnalyze', autoAnalyze.toString());

    await onUploadImage(formData);
    setDraggedImage(null);
    setSelectedPromptId('');
    setShowPromptSelection(false);
    setAutoAnalyze(true);
  };

  const handleCancelStagedImage = () => {
    setDraggedImage(null);
    setSelectedPromptId('');
    setShowPromptSelection(false);
  };

  const handleStartEditImagePrompt = (imageId, currentPromptId) => {
    setEditingImagePrompt(imageId);
    setSelectedImagePromptId(currentPromptId || '');
  };

  const handleUpdateImagePrompt = async (imageId) => {
    await onUpdateImagePrompt(imageId, selectedImagePromptId);
    setEditingImagePrompt(null);
    setSelectedImagePromptId('');
  };

  const handleCancelEditImagePrompt = () => {
    setEditingImagePrompt(null);
    setSelectedImagePromptId('');
  };

  const handleBatchAnalyze = async (forceAll = false) => {
    const message = forceAll
      ? t('images.confirmReanalyzeAll')
      : t('images.confirmBatchAnalyze');
    if (!window.confirm(message)) {
      return;
    }
    setBatchResult(null);
    const result = await onBatchAnalyze(forceAll);
    setBatchResult(result);
  };

  const unanalyzedCount = images.filter((img) => !img.description).length;

  return (
    <div className="section">
      <div className="section-header">
        <h2>{t('images.title')}</h2>
        <button className="generate-btn" onClick={() => setShowGenerationForm(!showGenerationForm)}>
          {showGenerationForm ? t('images.cancelGeneration') : t('images.generateImages')}
        </button>
      </div>

      {showGenerationForm && (
        <div className="generation-form-inline">
          <form onSubmit={handleGenerate} className="generation-form-row">
            <textarea
              value={generationPrompt}
              onChange={(e) => setGenerationPrompt(e.target.value)}
              placeholder={t('images.promptLabel')}
              rows={2}
              disabled={isGeneratingImages}
            />
            <select
              value={generationN}
              onChange={(e) => setGenerationN(parseInt(e.target.value))}
              disabled={isGeneratingImages}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {t('images.count', { n })}
                </option>
              ))}
            </select>
            <select
              value={generationAspectRatio}
              onChange={(e) => setGenerationAspectRatio(e.target.value)}
              disabled={isGeneratingImages}
            >
              {aspectRatioOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="generate-btn"
              disabled={isGeneratingImages || !generationPrompt.trim()}
            >
              {isGeneratingImages ? t('images.generating') : t('images.generate')}
            </button>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="genAutoAnalyze"
                checked={genAutoAnalyze}
                onChange={(e) => setGenAutoAnalyze(e.target.checked)}
                disabled={isGeneratingImages}
              />
              <label htmlFor="genAutoAnalyze">{t('images.autoAnalyze')}</label>
            </div>
          </form>
        </div>
      )}

      {pendingImages && pendingImages.length > 0 && (
        <div className="pending-images-section">
          <div className="pending-header">
            <h3>{t('images.pendingImages')}</h3>
            <div className="pending-actions">
              <button
                onClick={() => handleSavePending('prompt-and-images')}
                className="save-pending-btn save-with-prompt"
                disabled={isSavingPending}
              >
                {isSavingPending ? t('images.analyzing') : t('images.savePromptAndImages')}
              </button>
              <button
                onClick={() => handleSavePending('images-only')}
                className="save-pending-btn save-images-only"
                disabled={isSavingPending}
              >
                {isSavingPending ? t('images.analyzing') : t('images.saveImagesOnly')}
              </button>
              <button
                onClick={handleDiscardPending}
                className="discard-pending-btn"
                disabled={isSavingPending}
              >
                {isSavingPending ? t('common.saving') : t('images.discard')}
              </button>
            </div>
          </div>
          <div className="pending-images-grid">
            {pendingImages.map((img, index) => (
              <div
                key={index}
                className={`pending-image-card ${selectedPendingImages[index] ? 'selected' : ''}`}
              >
                <img
                  src={`/temp/${img.filename}`}
                  alt={t('images.generatingImageAlt', { index: index + 1 })}
                  onClick={() => togglePendingImage(index)}
                />
                <div className="pending-overlay">
                  <button
                    className="pending-preview-btn"
                    onClick={() => setPendingPreview(img)}
                    title={t('common.preview')}
                  >
                    👁
                  </button>
                  <span onClick={() => togglePendingImage(index)}>
                    {selectedPendingImages[index] ? `✓ ${t('common.selected')}` : t('images.clickToSelect')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!draggedImage && !showGenerationForm && (
        <>
          <form onSubmit={handleImageUpload} className="form-group">
            <label htmlFor="image">{t('images.uploadImage')}</label>
            <div className="file-input-wrapper">
              <input type="file" id="image" name="image" />
              <label htmlFor="image" className="file-input-label">{t('images.selectFile')}</label>
            </div>
            <label htmlFor="promptId">{t('images.linkPrompt')}</label>
            <select id="promptId" name="promptId">
              <option value="">{t('images.selectPrompt')}</option>
              {unusedPrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.content.substring(0, 50)}...
                </option>
              ))}
            </select>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="autoAnalyze"
                name="autoAnalyze"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
              />
              <label htmlFor="autoAnalyze">{t('images.autoAIAnalysis')}</label>
            </div>
            <button type="submit">{t('images.uploadImageBtn')}</button>
          </form>
          <div
            className="drag-drop-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p>{t('images.dragToUpload')}</p>
          </div>
        </>
      )}

      {draggedImage && (
        <div className="staged-image-section">
          <h3>{t('images.stagedImage')}</h3>
          <div className="staged-image-preview">
            <img src={URL.createObjectURL(draggedImage)} alt={t('images.stagedImage')} />
            <p>{t('images.fileName', { name: draggedImage.name })}</p>
            <p>{t('images.fileSize', { size: (draggedImage.size / 1024).toFixed(2) })}</p>
          </div>
          <form onSubmit={handleStagedImageUpload} className="form-group">
            <label htmlFor="stagedPromptId">{t('images.selectPromptLabel')}</label>
            <select
              id="stagedPromptId"
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
            >
              <option value="">{t('common.none')}</option>
              {unusedPrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.content.substring(0, 50)}...
                </option>
              ))}
            </select>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="stagedAutoAnalyze"
                name="stagedAutoAnalyze"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
              />
              <label htmlFor="stagedAutoAnalyze">{t('images.autoAIAnalysis')}</label>
            </div>
            <div className="staged-image-actions">
              <button type="submit">{t('images.confirmUpload')}</button>
              <button type="button" onClick={handleCancelStagedImage}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-section">
        <label>{t('images.filter')}</label>
        <select
          value={analyzedFilter}
          onChange={(e) => onAnalyzedFilterChange(e.target.value)}
          className="filter-select"
        >
          <option value="all">{t('images.allImages')}</option>
          <option value="analyzed">{t('images.analyzed')}</option>
          <option value="unanalyzed">{t('images.unanalyzed')}</option>
        </select>

        <div className="batch-analyze-buttons">
          <button
            onClick={() => handleBatchAnalyze(false)}
            disabled={batchAnalyzing}
            className="batch-analyze-btn"
          >
            {batchAnalyzing ? t('images.analyzing') : t('images.analyzeUnanalyzed')}
          </button>
          <button
            onClick={() => handleBatchAnalyze(true)}
            disabled={batchAnalyzing}
            className="batch-analyze-btn batch-analyze-btn-secondary"
          >
            {batchAnalyzing ? t('images.analyzing') : t('images.reanalyzeAll')}
          </button>
        </div>

        <span className="image-count">
          {t('images.totalImages', { count: images.length })}
          {unanalyzedCount > 0 && !batchAnalyzing && (
            <span className="unanalyzed-count">{t('images.unanalyzedCount', { count: unanalyzedCount })}</span>
          )}
        </span>

        {batchAnalyzing && batchProgress.total > 0 && (
          <div className="batch-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">
              {batchProgress.current} / {batchProgress.total} (
              {Math.round((batchProgress.current / batchProgress.total) * 100)}%)
            </span>
          </div>
        )}

        {batchResult && (
          <div
            className={`batch-result ${batchResult.updated > 0 ? 'success' : batchResult.failed > 0 ? 'error' : 'warning'}`}
          >
            <p>
              {t('images.batchComplete', {
                total: batchResult.total,
                updated: batchResult.updated,
                failed: batchResult.failed,
                skipped: batchResult.skipped > 0 ? t('images.batchSkipped', { count: batchResult.skipped }) : '',
              })}
              {batchResult.message && ` - ${batchResult.message}`}
            </p>
          </div>
        )}
      </div>

      <div className="images-grid">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            onDelete={onDeleteImage}
            onAnalyzeSingle={onAnalyzeSingleImage}
            analyzingImageId={analyzingImageId}
            editingScores={editingScores}
            scoreValues={scoreValues}
            onScoreEdit={onScoreEdit}
            onScoreChange={onScoreChange}
            onScoreConfirm={onScoreConfirm}
            onScoreCancel={onScoreCancel}
            editingImagePrompt={editingImagePrompt}
            selectedImagePromptId={selectedImagePromptId}
            onStartEditPrompt={handleStartEditImagePrompt}
            onUpdatePrompt={handleUpdateImagePrompt}
            onCancelEditPrompt={handleCancelEditImagePrompt}
            prompts={prompts}
            onPromptChange={(e) => setSelectedImagePromptId(e.target.value)}
          />
        ))}
      </div>

      {pendingPreview && (
        <div className="image-preview-modal" onClick={() => setPendingPreview(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close-btn" onClick={() => setPendingPreview(null)}>
              ×
            </button>
            <div className="preview-image-container">
              <img src={`/temp/${pendingPreview.filename}`} alt={t('imagePreview.previewAlt')} />
            </div>
            <div className="preview-actions">
              <button
                className="download-btn"
                onClick={async () => {
                  try {
                    const response = await fetch(`/temp/${pendingPreview.filename}`);
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = pendingPreview.filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  } catch (error) {
                    console.error('Download failed:', error);
                    alert(t('images.downloadFailed'));
                  }
                }}
              >
                {t('images.downloadImage')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImagesPage;

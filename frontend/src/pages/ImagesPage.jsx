import React, { useState } from 'react';
import ImageCard from '../components/ImageCard';

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
}) {
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
    // Select all by default
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

    // 使用状态中的autoAnalyze值
    if (!autoAnalyze) {
      formData.set('autoAnalyze', 'false');
    }

    await onUploadImage(formData);
    e.target.reset();
    // 重置checkbox状态为默认值
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
    // 重置checkbox状态为默认值
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
      ? '确定要重新分析所有图片吗？这可能需要一些时间。'
      : '确定要批量分析未分析的图片吗？这可能需要一些时间。';
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
        <h2>图片管理</h2>
        <button className="generate-btn" onClick={() => setShowGenerationForm(!showGenerationForm)}>
          {showGenerationForm ? '取消生成' : 'AI 生成图片'}
        </button>
      </div>

      {/* 生成图片表单 - 内联显示 */}
      {showGenerationForm && (
        <div className="generation-form-inline">
          <form onSubmit={handleGenerate} className="generation-form-row">
            <textarea
              value={generationPrompt}
              onChange={(e) => setGenerationPrompt(e.target.value)}
              placeholder="输入提示词描述想要生成的图片..."
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
                  {n} 张
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
              {isGeneratingImages ? '生成中...' : '生成'}
            </button>
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="genAutoAnalyze"
                checked={genAutoAnalyze}
                onChange={(e) => setGenAutoAnalyze(e.target.checked)}
                disabled={isGeneratingImages}
              />
              <label htmlFor="genAutoAnalyze">自动AI分析</label>
            </div>
          </form>
        </div>
      )}

      {/* 待保存的生成图片 */}
      {pendingImages && pendingImages.length > 0 && (
        <div className="pending-images-section">
          <div className="pending-header">
            <h3>生成的图片（待保存）</h3>
            <div className="pending-actions">
              <button
                onClick={() => handleSavePending('prompt-and-images')}
                className="save-pending-btn save-with-prompt"
              >
                保存提示词 + 图片
              </button>
              <button
                onClick={() => handleSavePending('images-only')}
                className="save-pending-btn save-images-only"
              >
                仅保存图片
              </button>
              <button onClick={handleDiscardPending} className="discard-pending-btn">
                丢弃
              </button>
            </div>
          </div>
          <div className="pending-images-grid">
            {pendingImages.map((img, index) => (
              <div
                key={index}
                className={`pending-image-card ${selectedPendingImages[index] ? 'selected' : ''}`}
                onClick={() => togglePendingImage(index)}
              >
                <img src={`/temp/${img.filename}`} alt={`生成图片 ${index + 1}`} />
                <div className="pending-overlay">
                  <span>{selectedPendingImages[index] ? '✓ 已选择' : '点击选择'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 当没有暂存图片时，显示普通上传表单和拖拽区域 */}
      {!draggedImage && !showGenerationForm && (
        <>
          <form onSubmit={handleImageUpload} className="form-group">
            <label htmlFor="image">上传图片：</label>
            <input type="file" id="image" name="image" />
            <label htmlFor="promptId">关联提示词：</label>
            <select id="promptId" name="promptId">
              <option value="">选择提示词</option>
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
              <label htmlFor="autoAnalyze">自动进行AI分析</label>
            </div>
            <button type="submit">上传图片</button>
          </form>
          <div
            className="drag-drop-area"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <p>拖拽图片到这里上传</p>
          </div>
        </>
      )}

      {/* 当有暂存图片时，显示暂存图片部分 */}
      {draggedImage && (
        <div className="staged-image-section">
          <h3>暂存图片</h3>
          <div className="staged-image-preview">
            <img src={URL.createObjectURL(draggedImage)} alt="暂存图片" />
            <p>文件名: {draggedImage.name}</p>
            <p>大小: {(draggedImage.size / 1024).toFixed(2)} KB</p>
          </div>
          <form onSubmit={handleStagedImageUpload} className="form-group">
            <label htmlFor="stagedPromptId">选择提示词：</label>
            <select
              id="stagedPromptId"
              value={selectedPromptId}
              onChange={(e) => setSelectedPromptId(e.target.value)}
            >
              <option value="">无</option>
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
              <label htmlFor="stagedAutoAnalyze">自动进行AI分析</label>
            </div>
            <div className="staged-image-actions">
              <button type="submit">确认上传</button>
              <button type="button" onClick={handleCancelStagedImage}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 筛选栏 - 放在图片列表上方，包含批量分析按钮 */}
      <div className="filter-section">
        <label>筛选：</label>
        <select
          value={analyzedFilter}
          onChange={(e) => onAnalyzedFilterChange(e.target.value)}
          className="filter-select"
        >
          <option value="all">全部图片</option>
          <option value="analyzed">已分析</option>
          <option value="unanalyzed">未分析</option>
        </select>

        <div className="batch-analyze-buttons">
          <button
            onClick={() => handleBatchAnalyze(false)}
            disabled={batchAnalyzing}
            className="batch-analyze-btn"
          >
            {batchAnalyzing ? '分析中...' : '分析未分析图片'}
          </button>
          <button
            onClick={() => handleBatchAnalyze(true)}
            disabled={batchAnalyzing}
            className="batch-analyze-btn batch-analyze-btn-secondary"
          >
            {batchAnalyzing ? '分析中...' : '重新分析全部'}
          </button>
        </div>

        <span className="image-count">
          共 {images.length} 张图片
          {unanalyzedCount > 0 && !batchAnalyzing && (
            <span className="unanalyzed-count">（{unanalyzedCount} 张图片待分析）</span>
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
              批量分析完成：共 {batchResult.total} 张，成功 {batchResult.updated} 张，失败{' '}
              {batchResult.failed} 张{batchResult.skipped > 0 && `，跳过 ${batchResult.skipped} 张`}
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
    </div>
  );
}

export default ImagesPage;

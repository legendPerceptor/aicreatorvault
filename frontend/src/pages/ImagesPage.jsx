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
  editingScores,
  scoreValues,
  onScoreEdit,
  onScoreChange,
  onScoreConfirm,
  onScoreCancel,
}) {
  const [draggedImage, setDraggedImage] = useState(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [showPromptSelection, setShowPromptSelection] = useState(false);
  const [editingImagePrompt, setEditingImagePrompt] = useState(null);
  const [selectedImagePromptId, setSelectedImagePromptId] = useState('');

  const handleImageUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await onUploadImage(formData);
    e.target.reset();
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

    await onUploadImage(formData);
    setDraggedImage(null);
    setSelectedPromptId('');
    setShowPromptSelection(false);
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

  return (
    <div className="section">
      <h2>图片管理</h2>
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

      {showPromptSelection && draggedImage && (
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
            <div className="staged-image-actions">
              <button type="submit">确认上传</button>
              <button type="button" onClick={handleCancelStagedImage}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="images-grid">
        {images.map((image) => (
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

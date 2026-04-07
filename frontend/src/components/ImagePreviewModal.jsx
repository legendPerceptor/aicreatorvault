import React from 'react';

function ImagePreviewModal({ image, onClose }) {
  if (!image) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/files/${image.user_id}/images/${image.filename}`, {
        credentials: 'include',
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = image.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败，请重试');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-preview-modal" onClick={handleBackdropClick}>
      <div className="image-preview-content">
        <button className="preview-close-btn" onClick={onClose}>
          ×
        </button>
        <div className="preview-image-container">
          <img src={`/api/files/${image.user_id}/images/${image.filename}`} alt="预览" />
        </div>
        <div className="preview-actions">
          <button className="download-btn" onClick={handleDownload}>
            下载图片
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImagePreviewModal;

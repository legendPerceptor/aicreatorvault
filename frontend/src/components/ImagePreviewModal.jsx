import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

function ImagePreviewModal({ image, onClose }) {
  const { t } = useTranslation();
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
      alert(t('imagePreview.downloadFailed'));
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
          <img src={`/api/files/${image.user_id}/images/${image.filename}`} alt={t('imagePreview.previewAlt')} />
        </div>
        <div className="preview-actions">
          <button className="download-btn" onClick={handleDownload}>
            {t('imagePreview.downloadImage')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImagePreviewModal;

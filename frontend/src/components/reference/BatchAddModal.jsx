import React, { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';

function BatchAddModal({ themes, selectedCount, onClose, onConfirm }) {
  const { t } = useTranslation();
  const [selectedTheme, setSelectedTheme] = useState(null);

  const handleConfirm = () => {
    onConfirm(selectedTheme);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('batchAdd.title')}</h3>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="info-text">
            {t('batchAdd.aboutToAdd')}<strong>{selectedCount}</strong>{t('batchAdd.images')}
          </p>

          <div className="theme-selector">
            <label>{t('batchAdd.selectTheme')}</label>
            <select
              value={selectedTheme || ''}
              onChange={(e) => setSelectedTheme(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t('batchAdd.noTheme')}</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          <div className="preview-info">
            <p>💡 {t('batchAdd.autoDownload')}</p>
            <p>🤖 {t('batchAdd.autoAnalyze')}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {t('batchAdd.cancel')}
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            {t('batchAdd.confirmAdd')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchAddModal;

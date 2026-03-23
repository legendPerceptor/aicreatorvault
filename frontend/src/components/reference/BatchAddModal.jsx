import React, { useState } from 'react';

function BatchAddModal({ themes, selectedCount, onClose, onConfirm }) {
  const [selectedTheme, setSelectedTheme] = useState(null);

  const handleConfirm = () => {
    onConfirm(selectedTheme);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>批量添加参考图</h3>
          <button className="btn-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="info-text">
            即将添加 <strong>{selectedCount}</strong> 张参考图到数据库
          </p>

          <div className="theme-selector">
            <label>选择主题（可选）：</label>
            <select
              value={selectedTheme || ''}
              onChange={(e) => setSelectedTheme(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">不关联主题</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          <div className="preview-info">
            <p>💡 图片将自动下载并添加到素材库</p>
            <p>🤖 系统会自动分析图片内容并生成标签</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            取消
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            确认添加
          </button>
        </div>
      </div>
    </div>
  );
}

export default BatchAddModal;

import React, { useState, useRef, useEffect } from 'react';

function SmartSearchBox({
  value = '',
  onChange,
  onSearch,
  onImageUpload,
  isSearching = false,
  placeholder = '搜索：输入关键词、描述你想要的内容，或拖入图片...',
  serviceStatus = 'unknown',
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [searchMode, setSearchMode] = useState('auto'); // auto | text | image
  const [uploadedImage, setUploadedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const detectIntent = (text) => {
    // 简单的意图检测
    if (!text || text.trim().length === 0) return 'empty';

    // 检测是否是图片搜索（如果用户上传了图片）
    if (uploadedImage) return 'image';

    // 检测是否是描述性搜索（通常较长，包含描述性词汇）
    const descriptiveWords = ['一个', '一张', '显示', '展示', '包含', '在', '穿着', '有', '是'];
    const hasDescriptive = descriptiveWords.some((word) => text.includes(word));

    if (text.length > 20 || hasDescriptive) {
      return 'semantic'; // 描述性内容使用语义搜索
    }

    // 短查询使用混合检索以获得最佳结果
    if (text.length > 2 && text.length <= 20) {
      return 'hybrid';
    }

    // 极短查询使用关键词搜索
    return 'keyword';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSearching) return;

    const intent = searchMode === 'auto' ? detectIntent(value) : searchMode;

    if (intent === 'image' && uploadedImage) {
      onSearch?.(uploadedImage, 'image');
    } else if (value.trim()) {
      onSearch?.(value.trim(), intent === 'semantic' ? 'semantic' : 'keyword');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) => file.type.startsWith('image/'));

    if (imageFile) {
      handleImageFile(imageFile);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
  };

  const handleImageFile = (file) => {
    setUploadedImage(file);

    // 创建预览
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
    }
    const previewUrl = URL.createObjectURL(file);
    setPreviewImage(previewUrl);

    // 自动切换到图片模式
    setSearchMode('image');

    // 触发搜索
    onImageUpload?.(file);
  };

  const clearImage = () => {
    setUploadedImage(null);
    if (previewImage) {
      URL.revokeObjectURL(previewImage);
      setPreviewImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSearchMode('auto');
  };

  const getStatusIcon = () => {
    switch (serviceStatus) {
      case 'connected':
        return '🟢';
      case 'disconnected':
        return '🔴';
      default:
        return '🟡';
    }
  };

  const getIntentBadge = () => {
    const intent = searchMode === 'auto' ? detectIntent(value) : searchMode;
    if (intent === 'empty' && !uploadedImage) return null;

    const badges = {
      keyword: { text: '关键词', icon: '🔍', color: '#3b82f6' },
      semantic: { text: 'AI 语义', icon: '🧠', color: '#8b5cf6' },
      image: { text: '以图搜图', icon: '🖼️', color: '#ec4899' },
      hybrid: { text: '混合检索', icon: '🔗', color: '#f59e0b' },
    };

    const badge = badges[intent];
    if (!badge) return null;

    return (
      <div className="intent-badge" style={{ backgroundColor: badge.color }}>
        {badge.icon} {badge.text}
      </div>
    );
  };

  return (
    <div
      className={`smart-search-box ${isDragOver ? 'drag-over' : ''}`}
      ref={dropZoneRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrapper">
          {/* 状态指示器 */}
          <div className="search-status" title={`AI 服务状态: ${serviceStatus}`}>
            {getStatusIcon()}
          </div>

          {/* 文本输入框 */}
          <input
            type="text"
            className="search-input"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={searchMode === 'image'}
          />

          {/* 意图徽章 */}
          {getIntentBadge()}

          {/* 操作按钮组 */}
          <div className="search-actions">
            {previewImage && (
              <>
                <div className="image-preview-mini" title={uploadedImage?.name}>
                  <img src={previewImage} alt="Preview" />
                </div>
                <button
                  type="button"
                  className="icon-btn clear-image-btn"
                  onClick={clearImage}
                  title="清除图片"
                >
                  ✕
                </button>
              </>
            )}

            <button
              type="button"
              className="icon-btn upload-btn"
              onClick={() => fileInputRef.current?.click()}
              title="上传图片搜索"
            >
              📁
            </button>

            <button
              type="submit"
              className="search-submit-btn"
              disabled={isSearching || (!value.trim() && !uploadedImage)}
            >
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {/* 搜索模式选择器 */}
        <div className="search-mode-selector">
          <label className="mode-label">搜索模式：</label>
          <div className="mode-options">
            <button
              type="button"
              className={`mode-option ${searchMode === 'auto' ? 'active' : ''}`}
              onClick={() => setSearchMode('auto')}
            >
              🤖 自动检测
            </button>
            <button
              type="button"
              className={`mode-option ${searchMode === 'keyword' ? 'active' : ''}`}
              onClick={() => setSearchMode('keyword')}
            >
              🔍 关键词
            </button>
            <button
              type="button"
              className={`mode-option ${searchMode === 'semantic' ? 'active' : ''}`}
              onClick={() => setSearchMode('semantic')}
            >
              🧠 AI 语义
            </button>
            <button
              type="button"
              className={`mode-option ${searchMode === 'hybrid' ? 'active' : ''}`}
              onClick={() => setSearchMode('hybrid')}
            >
              🔗 混合检索
            </button>
            <button
              type="button"
              className={`mode-option ${searchMode === 'image' ? 'active' : ''}`}
              onClick={() => {
                setSearchMode('image');
                fileInputRef.current?.click();
              }}
            >
              🖼️ 以图搜图
            </button>
          </div>
        </div>

        {/* 拖拽提示 */}
        {isDragOver && (
          <div className="drag-overlay">
            <div className="drag-message">
              <span className="drag-icon">📷</span>
              <p>拖放图片到这里进行搜索</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default SmartSearchBox;

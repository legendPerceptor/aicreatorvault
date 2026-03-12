import React from 'react';
import StarRating, { StaticStarRating } from './StarRating';

function ImageCard({
  image,
  onDelete,
  onAnalyzeSingle,
  analyzingImageId,
  onScoreEdit,
  onScoreChange,
  onScoreConfirm,
  onScoreCancel,
  editingScores,
  scoreValues,
  editingImagePrompt,
  selectedImagePromptId,
  onStartEditPrompt,
  onUpdatePrompt,
  onCancelEditPrompt,
  prompts,
  onPromptChange,
  showPromptEdit = true,
  showScore = true,
  showSimilarity = false,
  similarity = null,
}) {
  const formatSimilarity = (sim) => {
    if (sim === null || sim === undefined) return null;
    return `${(sim * 100).toFixed(1)}%`;
  };

  const isAnalyzed = !!image.description;
  
  return (
    <div className={`image-card ${isAnalyzed ? 'analyzed' : ''}`}>
      <div className="image-header">
        <img src={`/uploads/${image.filename}`} alt="AI生成" />
        {onDelete && (
          <button type="button" className="delete-btn" onClick={(e) => onDelete(e, image.id)}>
            ×
          </button>
        )}
        {showSimilarity && similarity !== null && (
          <div className="similarity-badge">相似度: {formatSimilarity(similarity)}</div>
        )}
        {isAnalyzed && (
          <div className="analyzed-badge">已分析</div>
        )}
      </div>
      <div className="content">
        {image.description && (
          <div className="ai-description">
            <div className="description-header">
              <span className="ai-label">AI 描述</span>
            </div>
            <p className="description-text">
              {image.description.length > 100
                ? `${image.description.substring(0, 100)}...`
                : image.description}
            </p>
            {image.analyzedAt && (
              <span className="analyzed-time">
                分析于: {new Date(image.analyzedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {showPromptEdit &&
          (editingImagePrompt === image.id ? (
            <div className="prompt-edit">
              <label>选择提示词：</label>
              <select value={selectedImagePromptId || ''} onChange={onPromptChange}>
                <option value="">无</option>
                {prompts.map((prompt) => (
                  <option key={prompt.id} value={prompt.id}>
                    {prompt.content.substring(0, 30)}...
                  </option>
                ))}
              </select>
              <div className="prompt-actions">
                <button onClick={() => onUpdatePrompt(image.id)}>确认</button>
                <button onClick={onCancelEditPrompt}>取消</button>
              </div>
            </div>
          ) : (
            <>
              {image.Prompt && (
                <div className="prompt">
                  <span>
                    {image.Prompt.content.substring(0, 30)}
                    {image.Prompt.content.length > 30 ? '...' : ''}
                  </span>
                  {onStartEditPrompt && (
                    <button
                      className="edit-prompt-btn"
                      onClick={() => onStartEditPrompt(image.id, image.Prompt.id)}
                    >
                      修改
                    </button>
                  )}
                </div>
              )}
              {!image.Prompt && (
                <div className="prompt">
                  <span>无关联提示词</span>
                  {onStartEditPrompt && (
                    <button className="edit-prompt-btn" onClick={() => onStartEditPrompt(image.id)}>
                      添加
                    </button>
                  )}
                </div>
              )}
            </>
          ))}

        {onAnalyzeSingle && !isAnalyzed && (
          <div className="analyze-action">
            <button 
              type="button" 
              className="analyze-single-btn" 
              onClick={() => onAnalyzeSingle(image.id)}
              disabled={analyzingImageId === image.id}
            >
              {analyzingImageId === image.id ? '分析中...' : '分析图片'}
            </button>
          </div>
        )}

        {showScore && (
          <div className="score">
            <label>评分：</label>
            {editingScores[`images_${image.id}`] ? (
              <div className="score-edit">
                <StarRating
                  type="images"
                  id={image.id}
                  score={scoreValues[`images_${image.id}`] || 0}
                  onScoreChange={onScoreChange}
                />
                <div className="score-actions">
                  <button onClick={() => onScoreConfirm('images', image.id)}>确认</button>
                  <button onClick={() => onScoreCancel('images', image.id)}>取消</button>
                </div>
              </div>
            ) : (
              <span className="score-value" onClick={() => onScoreEdit('images', image.id)}>
                {image.score ? <StaticStarRating score={image.score} /> : '点击评分'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SimpleImageCard({ image, onDelete, onAddToTheme }) {
  return (
    <div className="image-card">
      <div className="image-header">
        <img src={`/uploads/${image.filename}`} alt="AI生成" />
        {onDelete && (
          <button type="button" className="delete-btn" onClick={() => onDelete(image.id)}>
            ×
          </button>
        )}
      </div>
      {onAddToTheme && (
        <button className="add-to-theme-btn" onClick={() => onAddToTheme(image.id)}>
          添加到主题
        </button>
      )}
    </div>
  );
}

export default ImageCard;

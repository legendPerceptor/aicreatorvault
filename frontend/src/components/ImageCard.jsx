import React, { useState } from 'react';
import StarRating, { StaticStarRating } from './StarRating';
import ImagePreviewModal from './ImagePreviewModal';
import { SimilarityBadge, MatchReason } from './search/SimilarityRadar';
import { useTranslation } from '../i18n/useTranslation';
import { getImageUrl } from '../utils/imageUrl';

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
  matchReasons = null,
  viewMode = 'grid',
}) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);

  const formatSimilarity = (sim) => {
    if (sim === null || sim === undefined) return null;
    return `${(sim * 100).toFixed(1)}%`;
  };

  const isAnalyzed = !!image.description;

  return (
    <>
      <div className={`image-card ${isAnalyzed ? 'analyzed' : ''} view-${viewMode}`}>
        <div className="image-header">
          <img
            src={getImageUrl(image)}
            alt={t('imageCard.aiGenerated')}
            onClick={() => setShowPreview(true)}
            style={{ cursor: 'pointer' }}
          />
          {onDelete && (
            <button type="button" className="delete-btn" onClick={(e) => onDelete(e, image.id)}>
              ×
            </button>
          )}
          {showSimilarity && similarity !== null && <SimilarityBadge similarity={similarity} />}
          {isAnalyzed && <div className="analyzed-badge">{t('imageCard.analyzed')}</div>}
        </div>
        <div className="content">
          {showSimilarity && matchReasons && matchReasons.length > 0 && (
            <MatchReason reasons={matchReasons} />
          )}

          {image.description && (
            <div className="ai-description">
              <div className="description-header">
                <span className="ai-label">{t('imageCard.aiDescription')}</span>
              </div>
              <p className="description-text">
                {image.description.length > 100
                  ? `${image.description.substring(0, 100)}...`
                  : image.description}
              </p>
              {image.analyzedAt && (
                <span className="analyzed-time">
                  {t('imageCard.analyzedAt', {
                    date: new Date(image.analyzedAt).toLocaleDateString(),
                  })}
                </span>
              )}
            </div>
          )}

          {showPromptEdit &&
            (editingImagePrompt === image.id ? (
              <div className="prompt-edit">
                <label>{t('imageCard.selectPrompt')}</label>
                <select value={selectedImagePromptId || ''} onChange={onPromptChange}>
                  <option value="">{t('common.none')}</option>
                  {prompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.content.substring(0, 30)}...
                    </option>
                  ))}
                </select>
                <div className="prompt-actions">
                  <button onClick={() => onUpdatePrompt(image.id)}>{t('common.confirm')}</button>
                  <button onClick={onCancelEditPrompt}>{t('common.cancel')}</button>
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
                        {t('imageCard.modify')}
                      </button>
                    )}
                  </div>
                )}
                {!image.Prompt && (
                  <div className="prompt">
                    <span>{t('imageCard.noLinkedPrompt')}</span>
                    {onStartEditPrompt && (
                      <button
                        className="edit-prompt-btn"
                        onClick={() => onStartEditPrompt(image.id)}
                      >
                        {t('imageCard.addPrompt')}
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
                {analyzingImageId === image.id
                  ? t('imageCard.analyzing')
                  : t('imageCard.analyzeImage')}
              </button>
            </div>
          )}

          {showScore && (
            <div className="score">
              <label>{t('imageCard.score')}</label>
              {editingScores[`images_${image.id}`] ? (
                <div className="score-edit">
                  <StarRating
                    type="images"
                    id={image.id}
                    score={scoreValues[`images_${image.id}`] || 0}
                    onScoreChange={onScoreChange}
                  />
                  <div className="score-actions">
                    <button onClick={() => onScoreConfirm('images', image.id)}>
                      {t('common.confirm')}
                    </button>
                    <button onClick={() => onScoreCancel('images', image.id)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <span className="score-value" onClick={() => onScoreEdit('images', image.id)}>
                  {image.score ? (
                    <StaticStarRating score={image.score} />
                  ) : (
                    t('imageCard.clickToScore')
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {showPreview && <ImagePreviewModal image={image} onClose={() => setShowPreview(false)} />}
    </>
  );
}

export function SimpleImageCard({ image, onDelete, onAddToTheme }) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <div className="image-card">
        <div className="image-header">
          <img
            src={getImageUrl(image)}
            alt={t('imageCard.aiGenerated')}
            onClick={() => setShowPreview(true)}
            style={{ cursor: 'pointer' }}
          />
          {onDelete && (
            <button type="button" className="delete-btn" onClick={() => onDelete(image.id)}>
              ×
            </button>
          )}
        </div>
        {onAddToTheme && (
          <button className="add-to-theme-btn" onClick={() => onAddToTheme(image.id)}>
            {t('imageCard.addToTheme')}
          </button>
        )}
      </div>
      {showPreview && <ImagePreviewModal image={image} onClose={() => setShowPreview(false)} />}
    </>
  );
}

export default ImageCard;

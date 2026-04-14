import React, { useState } from 'react';
import StarRating, { StaticStarRating } from '../components/StarRating';
import ImageCard from '../components/ImageCard';
import { useTranslation } from '../i18n/useTranslation';

function PromptsPage({
  prompts,
  unusedPrompts,
  onAddPrompt,
  onDeletePrompt,
  onUpdateScore,
  onDeleteImage,
  editingScores,
  scoreValues,
  onScoreEdit,
  onScoreChange,
  onScoreConfirm,
  onScoreCancel,
}) {
  const [newPrompt, setNewPrompt] = useState('');
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    await onAddPrompt(newPrompt);
    setNewPrompt('');
  };

  return (
    <div className="section">
      <h2>{t('prompts.title')}</h2>
      <form onSubmit={handleSubmit} className="form-group">
        <label htmlFor="prompt">{t('prompts.newPrompt')}</label>
        <textarea
          id="prompt"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder={t('prompts.promptPlaceholder')}
        />
        <button type="submit">{t('prompts.addPrompt')}</button>
      </form>
      <div className="prompts-list">
        <h3>{t('prompts.historyPrompts')}</h3>
        {prompts.map((prompt) => (
          <div key={prompt.id} className="prompt-container-vertical">
            <div className="prompt-content">
              <div className="prompt-header">
                <p>{prompt.content}</p>
              </div>
              <div className="score-container">
                <div className="score">
                  <label>{t('prompts.score')}</label>
                  {editingScores[`prompts_${prompt.id}`] ? (
                    <div className="score-edit">
                      <StarRating
                        type="prompts"
                        id={prompt.id}
                        score={scoreValues[`prompts_${prompt.id}`] || 0}
                        onScoreChange={onScoreChange}
                      />
                      <div className="score-actions">
                        <button onClick={() => onScoreConfirm('prompts', prompt.id)}>{t('common.confirm')}</button>
                        <button onClick={() => onScoreCancel('prompts', prompt.id)}>{t('common.cancel')}</button>
                      </div>
                    </div>
                  ) : (
                    <span className="score-value" onClick={() => onScoreEdit('prompts', prompt.id)}>
                      {prompt.score ? <StaticStarRating score={prompt.score} /> : t('prompts.clickToScore')}
                    </span>
                  )}
                </div>
                <div className="prompt-actions">
                  <button
                    type="button"
                    className="delete-prompt-btn"
                    onClick={(e) => onDeletePrompt(e, prompt.id, true)}
                  >
                    {t('prompts.deletePromptAndImages')}
                  </button>
                  <button
                    type="button"
                    className="delete-prompt-only-btn"
                    onClick={(e) => onDeletePrompt(e, prompt.id, false)}
                  >
                    {t('prompts.deletePromptOnly')}
                  </button>
                </div>
              </div>
            </div>
            <div className="prompt-images">
              {prompt.Images && prompt.Images.length > 0 ? (
                prompt.Images.map((image) => (
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
                    showPromptEdit={false}
                  />
                ))
              ) : (
                <div className="no-images">
                  <p>{t('prompts.noImages')}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptsPage;

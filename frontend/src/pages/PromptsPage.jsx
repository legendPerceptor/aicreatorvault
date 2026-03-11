import React, { useState } from 'react';
import StarRating, { StaticStarRating } from '../components/StarRating';
import ImageCard from '../components/ImageCard';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    await onAddPrompt(newPrompt);
    setNewPrompt('');
  };

  return (
    <div className="section">
      <h2>提示词管理</h2>
      <form onSubmit={handleSubmit} className="form-group">
        <label htmlFor="prompt">新提示词：</label>
        <textarea
          id="prompt"
          value={newPrompt}
          onChange={(e) => setNewPrompt(e.target.value)}
          placeholder="输入你的提示词..."
        />
        <button type="submit">添加提示词</button>
      </form>
      <div className="prompts-list">
        <h3>历史提示词</h3>
        {prompts.map((prompt) => (
          <div key={prompt.id} className="prompt-container">
            <div className="prompt-content">
              <div className="prompt-header">
                <p>{prompt.content}</p>
              </div>
              <div className="score-container">
                <div className="score">
                  <label>评分：</label>
                  {editingScores[`prompts_${prompt.id}`] ? (
                    <div className="score-edit">
                      <StarRating
                        type="prompts"
                        id={prompt.id}
                        score={scoreValues[`prompts_${prompt.id}`] || 0}
                        onScoreChange={onScoreChange}
                      />
                      <div className="score-actions">
                        <button onClick={() => onScoreConfirm('prompts', prompt.id)}>
                          确认
                        </button>
                        <button onClick={() => onScoreCancel('prompts', prompt.id)}>
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className="score-value"
                      onClick={() => onScoreEdit('prompts', prompt.id)}
                    >
                      {prompt.score ? (
                        <StaticStarRating score={prompt.score} />
                      ) : (
                        '点击评分'
                      )}
                    </span>
                  )}
                </div>
                <div className="prompt-actions">
                  <button
                    type="button"
                    className="delete-prompt-btn"
                    onClick={(e) => onDeletePrompt(e, prompt.id, true)}
                  >
                    删除提示词及图片
                  </button>
                  <button
                    type="button"
                    className="delete-prompt-only-btn"
                    onClick={(e) => onDeletePrompt(e, prompt.id, false)}
                  >
                    仅删除提示词
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
                  <p>无关联图片</p>
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

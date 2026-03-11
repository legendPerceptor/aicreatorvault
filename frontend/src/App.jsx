import React, { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('prompts');
  const [prompts, setPrompts] = useState([]);
  const [unusedPrompts, setUnusedPrompts] = useState([]);
  const [images, setImages] = useState([]);
  const [themes, setThemes] = useState([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newTheme, setNewTheme] = useState({ name: '', description: '' });
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [draggedImage, setDraggedImage] = useState(null);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [showPromptSelection, setShowPromptSelection] = useState(false);
  const [editingScores, setEditingScores] = useState({});
  const [scoreValues, setScoreValues] = useState({});
  const [confirmingScore, setConfirmingScore] = useState(null);

  // 处理图片重新绑定提示词
  const [editingImagePrompt, setEditingImagePrompt] = useState(null);
  const [selectedImagePromptId, setSelectedImagePromptId] = useState('');

  // 获取所有提示词
  useEffect(() => {
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => setPrompts(data));
  }, []);

  // 获取未被使用的提示词
  useEffect(() => {
    fetch('/api/prompts/unused')
      .then(res => res.json())
      .then(data => setUnusedPrompts(data));
  }, [images]);

  // 获取所有图片
  useEffect(() => {
    fetch('/api/images')
      .then(res => res.json())
      .then(data => setImages(data));
  }, []);

  // 获取所有主题
  useEffect(() => {
    fetch('/api/themes')
      .then(res => res.json())
      .then(data => setThemes(data));
  }, []);

  // 处理提示词提交
  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content: newPrompt })
    });
    const newPromptData = await response.json();
    setPrompts([...prompts, newPromptData]);
    setNewPrompt('');
    // 重新获取未使用的提示词列表
    fetch('/api/prompts/unused')
      .then(res => res.json())
      .then(data => setUnusedPrompts(data));
  };

  // 处理图片上传
  const handleImageUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const response = await fetch('/api/images', {
      method: 'POST',
      body: formData
    });
    const newImageData = await response.json();
    setImages([...images, newImageData]);
  };

  // 处理开始编辑评分
  const handleStartEditScore = (type, id) => {
    // 初始化评分值为当前评分
    const currentScore = type === 'prompts' 
      ? prompts.find(p => p.id === id)?.score || 0
      : images.find(i => i.id === id)?.score || 0;
    
    setScoreValues(prev => ({
      ...prev,
      [`${type}_${id}`]: currentScore
    }));
    
    setEditingScores(prev => ({
      ...prev,
      [`${type}_${id}`]: true
    }));
  };

  // 处理评分变化
  const handleScoreChange = (type, id, score) => {
    console.log(`用户选择了 ${score} 分 (${score/2} 星) for ${type} ${id}`);
    setScoreValues(prev => ({
      ...prev,
      [`${type}_${id}`]: score
    }));
  };

  // 处理确认评分
  const handleConfirmScore = async (type, id) => {
    const score = scoreValues[`${type}_${id}`];
    if (score === undefined) return;
    
    const response = await fetch(`/api/${type}/${id}/score`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ score })
    });
    const updatedData = await response.json();
    
    if (type === 'prompts') {
      setPrompts(prompts.map(prompt => 
        prompt.id === id ? updatedData : prompt
      ));
    } else if (type === 'images') {
      // 更新images状态
      setImages(images.map(image => 
        image.id === id ? updatedData : image
      ));
      
      // 同时更新prompts状态中的对应图片数据
      setPrompts(prompts.map(prompt => {
        if (prompt.Images) {
          return {
            ...prompt,
            Images: prompt.Images.map(image => 
              image.id === id ? updatedData : image
            )
          };
        }
        return prompt;
      }));
    }
    
    // 结束编辑状态
    setEditingScores(prev => ({
      ...prev,
      [`${type}_${id}`]: false
    }));
    
    // 清除评分值
    setScoreValues(prev => {
      const newValues = { ...prev };
      delete newValues[`${type}_${id}`];
      return newValues;
    });
  };

  // 处理取消评分
  const handleCancelScore = (type, id) => {
    // 结束编辑状态
    setEditingScores(prev => ({
      ...prev,
      [`${type}_${id}`]: false
    }));
    
    // 清除评分值
    setScoreValues(prev => {
      const newValues = { ...prev };
      delete newValues[`${type}_${id}`];
      return newValues;
    });
  };

  // 渲染星星评分组件
  const StarRating = ({ type, id, score, onScoreChange }) => {
    const [hoverScore, setHoverScore] = useState(null);
    const displayScore = hoverScore !== null ? hoverScore : score;
    const fullStars = Math.floor(displayScore / 2);
    const hasHalfStar = displayScore % 2 === 1;
    
    const handleMouseEnter = (starIndex) => {
      setHoverScore(starIndex * 2);
    };
    
    const handleMouseLeave = () => {
      setHoverScore(null);
    };
    
    const handleClick = (starIndex, isHalf = false) => {
      if (isHalf) {
        onScoreChange(type, id, (starIndex - 1) * 2 + 1);
      } else {
        onScoreChange(type, id, starIndex * 2);
      }
    };
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      let starClass = 'star empty';
      
      if (i <= fullStars) {
        starClass = 'star full';
      } else if (i === fullStars + 1 && hasHalfStar) {
        starClass = 'star half';
      }
      
      stars.push(
        <div key={i} className="star-container">
          <span 
            className={starClass} 
            onClick={() => handleClick(i)}
            onMouseEnter={() => handleMouseEnter(i)}
            onMouseLeave={handleMouseLeave}
          >
            ★
          </span>
          <div 
            className="half-click-area"
            onClick={() => handleClick(i, true)}
            onMouseEnter={() => setHoverScore((i - 1) * 2 + 1)}
            onMouseLeave={handleMouseLeave}
          ></div>
        </div>
      );
    }
    
    return (
      <div className="star-rating" onMouseLeave={handleMouseLeave}>
        {stars}
      </div>
    );
  };

  // 处理删除图片
  const handleDeleteImage = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('=== 删除按钮被点击 ===');
    console.log('图片ID:', id);
    console.log('事件类型:', e.type);
    console.log('当前图片列表长度:', images.length);
    console.log('图片列表:', images);
    
    // 立即显示确认对话框
    const confirmed = window.confirm('确定要删除这张图片吗？');
    console.log('用户确认结果:', confirmed);
    
    if (confirmed) {
      console.log('用户确认删除，开始发送请求');
      // 模拟延迟，确保确认对话框完全关闭
      setTimeout(() => {
        fetch(`/api/images/${id}`, {
          method: 'DELETE'
        })
        .then(response => {
          console.log('删除请求响应:', response);
          return response.json();
        })
        .then(data => {
          console.log('删除请求成功，响应数据:', data);
          console.log('更新前图片列表长度:', images.length);
          const updatedImages = images.filter(image => image.id !== id);
          console.log('更新后图片列表长度:', updatedImages.length);
          setImages(updatedImages);
          // 同时更新提示词中的图片列表
          const updatedPrompts = prompts.map(prompt => {
            if (prompt.Images) {
              return {
                ...prompt,
                Images: prompt.Images.filter(image => image.id !== id)
              };
            }
            return prompt;
          });
          setPrompts(updatedPrompts);
          // 重新获取未使用的提示词列表
          fetch('/api/prompts/unused')
            .then(res => res.json())
            .then(data => setUnusedPrompts(data));
          console.log('状态更新完成');
        })
        .catch(error => {
          console.error('删除图片失败:', error);
        });
      }, 100);
    } else {
      console.log('用户取消删除，不更新状态');
      console.log('取消删除后图片列表长度:', images.length);
      // 验证图片列表确实没有变化
      console.log('取消删除后图片列表:', images);
    }
  };

  // 处理删除提示词
  const handleDeletePrompt = (e, id, deleteImages = true) => {
    e.preventDefault();
    const confirmMessage = deleteImages 
      ? '确定要删除这个提示词及其关联的所有图片吗？' 
      : '确定要仅删除这个提示词，保留关联的图片吗？';
    
    if (window.confirm(confirmMessage)) {
      fetch(`/api/prompts/${id}?deleteImages=${deleteImages}`, {
        method: 'DELETE'
      })
      .then(() => {
        setPrompts(prompts.filter(prompt => prompt.id !== id));
        // 如果删除图片，同时从图片列表中删除关联的图片
        if (deleteImages) {
          const prompt = prompts.find(p => p.id === id);
          if (prompt && prompt.Images) {
            const imageIds = prompt.Images.map(image => image.id);
            setImages(images.filter(image => !imageIds.includes(image.id)));
          }
        } else {
          // 仅删除提示词，更新图片列表中关联图片的Prompt为null
          const prompt = prompts.find(p => p.id === id);
          if (prompt && prompt.Images) {
            setImages(images.map(image => {
              if (prompt.Images.some(img => img.id === image.id)) {
                return { ...image, Prompt: null };
              }
              return image;
            }));
          }
        }
        // 重新获取未使用的提示词列表
        fetch('/api/prompts/unused')
          .then(res => res.json())
          .then(data => setUnusedPrompts(data));
      })
      .catch(error => {
        console.error('删除提示词失败:', error);
      });
    }
  };

  // 处理主题创建
  const handleThemeSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newTheme)
    });
    const newThemeData = await response.json();
    setThemes([...themes, newThemeData]);
    setNewTheme({ name: '', description: '' });
  };

  // 处理主题选择
  const handleThemeSelect = async (theme) => {
    setSelectedTheme(theme);
  };

  // 处理图片添加到主题
  const handleAddImageToTheme = async (imageId) => {
    if (!selectedTheme) return;
    await fetch(`/api/themes/${selectedTheme.id}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageId })
    });
    // 重新获取主题数据
    fetch('/api/themes')
      .then(res => res.json())
      .then(data => {
        setThemes(data);
        // 更新selectedTheme状态，确保当前打开的主题详情页面能立即显示新添加的图片
        const updatedTheme = data.find(theme => theme.id === selectedTheme.id);
        if (updatedTheme) {
          setSelectedTheme(updatedTheme);
        }
      });
  };

  // 处理从主题中移出图片
  const handleRemoveImageFromTheme = async (imageId) => {
    if (!selectedTheme) return;
    try {
      const response = await fetch(`/api/themes/${selectedTheme.id}/images/${imageId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // 重新获取主题数据
        const themesData = await fetch('/api/themes').then(res => res.json());
        setThemes(themesData);
        // 更新selectedTheme状态，确保当前打开的主题详情页面能立即显示移除后的图片列表
        const updatedTheme = themesData.find(theme => theme.id === selectedTheme.id);
        if (updatedTheme) {
          setSelectedTheme(updatedTheme);
        }
      } else {
        console.error('从主题中移除图片失败');
      }
    } catch (error) {
      console.error('从主题中移除图片时发生错误:', error);
    }
  };

  // 处理搜索
  const handleSearch = async (e) => {
    e.preventDefault();
    // 这里可以实现更复杂的搜索逻辑，目前简单过滤
    const results = images.filter(image => 
      image.Prompt && image.Prompt.content.includes(searchQuery)
    );
    setSearchResults(results);
  };

  // 处理拖拽上传
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
      // 存储拖拽的图片到暂存区
      setDraggedImage(files[0]);
      setSelectedPromptId('');
      setShowPromptSelection(true);
    }
  };

  // 处理暂存图片的上传
  const handleStagedImageUpload = async (e) => {
    e.preventDefault();
    if (!draggedImage || !selectedPromptId) return;
    
    const formData = new FormData();
    formData.append('image', draggedImage);
    formData.append('promptId', selectedPromptId);
    
    const response = await fetch('/api/images', {
      method: 'POST',
      body: formData
    });
    
    const newImageData = await response.json();
    setImages([...images, newImageData]);
    setDraggedImage(null);
    setSelectedPromptId('');
    setShowPromptSelection(false);
    // 重新获取提示词列表和未使用的提示词列表
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => setPrompts(data));
    fetch('/api/prompts/unused')
      .then(res => res.json())
      .then(data => setUnusedPrompts(data));
  };

  // 处理取消暂存图片
  const handleCancelStagedImage = () => {
    setDraggedImage(null);
    setSelectedPromptId('');
    setShowPromptSelection(false);
  };

  // 处理开始编辑图片提示词
  const handleStartEditImagePrompt = (imageId, currentPromptId) => {
    setEditingImagePrompt(imageId);
    setSelectedImagePromptId(currentPromptId || '');
  };

  // 处理更新图片提示词
  const handleUpdateImagePrompt = async (imageId) => {
    const response = await fetch(`/api/images/${imageId}/prompt`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ promptId: selectedImagePromptId || null })
    });
    const updatedImage = await response.json();
    
    // 更新图片列表
    setImages(images.map(image => 
      image.id === imageId ? updatedImage : image
    ));
    
    // 同时更新提示词中的图片列表
    setPrompts(prompts.map(prompt => {
      if (prompt.Images) {
        return {
          ...prompt,
          Images: prompt.Images.map(image => 
            image.id === imageId ? updatedImage : image
          )
        };
      }
      return prompt;
    }));
    
    // 重新获取未使用的提示词列表
    fetch('/api/prompts/unused')
      .then(res => res.json())
      .then(data => setUnusedPrompts(data));
    
    setEditingImagePrompt(null);
    setSelectedImagePromptId('');
  };

  // 处理取消编辑图片提示词
  const handleCancelEditImagePrompt = () => {
    setEditingImagePrompt(null);
    setSelectedImagePromptId('');
  };

  return (
    <div className="app">
      <div className="header">
        <h1>AIGC 辅助工具</h1>
        <p>管理你的 AI 创作资产</p>
      </div>

      <div className="nav">
        <button onClick={() => setActiveTab('prompts')}>提示词管理</button>
        <button onClick={() => setActiveTab('images')}>图片管理</button>
        <button onClick={() => setActiveTab('themes')}>主题管理</button>
        <button onClick={() => setActiveTab('search')}>检索参考</button>
      </div>

      {activeTab === 'prompts' && (
        <div className="section">
          <h2>提示词管理</h2>
          <form onSubmit={handlePromptSubmit} className="form-group">
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
            {prompts.map(prompt => (
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
                            onScoreChange={handleScoreChange} 
                          />
                          <div className="score-actions">
                            <button onClick={() => handleConfirmScore('prompts', prompt.id)}>确认</button>
                            <button onClick={() => handleCancelScore('prompts', prompt.id)}>取消</button>
                          </div>
                        </div>
                      ) : (
                        <span className="score-value" onClick={() => handleStartEditScore('prompts', prompt.id)}>
                          {prompt.score ? (
                            <div className="star-rating static">
                              {Array(5).fill(0).map((_, i) => {
                                const starValue = (i + 1) * 2;
                                if (prompt.score >= starValue) {
                                  return <span key={i} className="star full">★</span>;
                                } else if (prompt.score >= starValue - 1) {
                                  return <span key={i} className="star half">★</span>;
                                } else {
                                  return <span key={i} className="star empty">★</span>;
                                }
                              })}
                            </div>
                          ) : '点击评分'}
                        </span>
                      )}
                    </div>
                    <div className="prompt-actions">
                      <button type="button" className="delete-prompt-btn" onClick={(e) => handleDeletePrompt(e, prompt.id, true)}>删除提示词及图片</button>
                      <button type="button" className="delete-prompt-only-btn" onClick={(e) => handleDeletePrompt(e, prompt.id, false)}>仅删除提示词</button>
                    </div>
                  </div>
                </div>
                <div className="prompt-images">
                  {prompt.Images && prompt.Images.length > 0 ? (
                    prompt.Images.map(image => (
                      <div key={image.id} className="image-card">
                        <div className="image-header">
                          <img src={`/uploads/${image.filename}`} alt="AI生成" />
                          <button type="button" className="delete-btn" onClick={(e) => handleDeleteImage(e, image.id)}>×</button>
                        </div>
                        <div className="content">
                          <div className="score">
                            <label>评分：</label>
                            {editingScores[`images_${image.id}`] ? (
                              <div className="score-edit">
                                <StarRating 
                                  type="images" 
                                  id={image.id} 
                                  score={scoreValues[`images_${image.id}`] || 0} 
                                  onScoreChange={handleScoreChange} 
                                />
                                <div className="score-actions">
                                  <button onClick={() => handleConfirmScore('images', image.id)}>确认</button>
                                  <button onClick={() => handleCancelScore('images', image.id)}>取消</button>
                                </div>
                              </div>
                            ) : (
                              <span className="score-value" onClick={() => handleStartEditScore('images', image.id)}>
                                {image.score ? (
                                  <div className="star-rating static">
                                    {Array(5).fill(0).map((_, i) => {
                                      const starValue = (i + 1) * 2;
                                      if (image.score >= starValue) {
                                        return <span key={i} className="star full">★</span>;
                                      } else if (image.score >= starValue - 1) {
                                        return <span key={i} className="star half">★</span>;
                                      } else {
                                        return <span key={i} className="star empty">★</span>;
                                      }
                                    })}
                                  </div>
                                ) : '点击评分'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
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
      )}

      {activeTab === 'images' && (
        <div className="section">
          <h2>图片管理</h2>
          <form onSubmit={handleImageUpload} className="form-group">
            <label htmlFor="image">上传图片：</label>
            <input type="file" id="image" name="image" />
            <label htmlFor="promptId">关联提示词：</label>
            <select id="promptId" name="promptId">
              <option value="">选择提示词</option>
              {unusedPrompts.map(prompt => (
                <option key={prompt.id} value={prompt.id}>{prompt.content.substring(0, 50)}...</option>
              ))}
            </select>
            <button type="submit">上传图片</button>
          </form>
          <div className="drag-drop-area"
               onDragOver={handleDragOver}
               onDragLeave={handleDragLeave}
               onDrop={handleDrop}>
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
                  <option value="">选择提示词</option>
                  {unusedPrompts.map(prompt => (
                    <option key={prompt.id} value={prompt.id}>{prompt.content.substring(0, 50)}...</option>
                  ))}
                </select>
                <div className="staged-image-actions">
                  <button type="submit">确认上传</button>
                  <button type="button" onClick={handleCancelStagedImage}>取消</button>
                </div>
              </form>
            </div>
          )}
          <div className="images-grid">
            {images.map(image => (
              <div key={image.id} className="image-card">
                <div className="image-header">
                  <img src={`/uploads/${image.filename}`} alt="AI生成" />
                  <button type="button" className="delete-btn" onClick={(e) => handleDeleteImage(e, image.id)}>×</button>
                </div>
                <div className="content">
                  {editingImagePrompt === image.id ? (
                    <div className="prompt-edit">
                      <label>选择提示词：</label>
                      <select 
                        value={selectedImagePromptId} 
                        onChange={(e) => setSelectedImagePromptId(e.target.value)}
                      >
                        <option value="">无</option>
                        {prompts.map(prompt => (
                          <option key={prompt.id} value={prompt.id}>{prompt.content.substring(0, 30)}...</option>
                        ))}
                      </select>
                      <div className="prompt-actions">
                        <button onClick={() => handleUpdateImagePrompt(image.id)}>确认</button>
                        <button onClick={handleCancelEditImagePrompt}>取消</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {image.Prompt && (
                        <div className="prompt">
                          <span>{image.Prompt.content.substring(0, 30)}{image.Prompt.content.length > 30 ? '...' : ''}</span>
                          <button className="edit-prompt-btn" onClick={() => handleStartEditImagePrompt(image.id, image.Prompt.id)}>修改</button>
                        </div>
                      )}
                      {!image.Prompt && (
                        <div className="prompt">
                          <span>无关联提示词</span>
                          <button className="edit-prompt-btn" onClick={() => handleStartEditImagePrompt(image.id)}>添加</button>
                        </div>
                      )}
                    </>
                  )}
                  <div className="score">
                    <label>评分：</label>
                    {editingScores[`images_${image.id}`] ? (
                      <div className="score-edit">
                        <StarRating 
                          type="images" 
                          id={image.id} 
                          score={scoreValues[`images_${image.id}`] || 0} 
                          onScoreChange={handleScoreChange} 
                        />
                        <div className="score-actions">
                          <button onClick={() => handleConfirmScore('images', image.id)}>确认</button>
                          <button onClick={() => handleCancelScore('images', image.id)}>取消</button>
                        </div>
                      </div>
                    ) : (
                      <span className="score-value" onClick={() => handleStartEditScore('images', image.id)}>
                        {image.score ? (
                          <div className="star-rating static">
                            {Array(5).fill(0).map((_, i) => {
                              const starValue = (i + 1) * 2;
                              if (image.score >= starValue) {
                                return <span key={i} className="star full">★</span>;
                              } else if (image.score >= starValue - 1) {
                                return <span key={i} className="star half">★</span>;
                              } else {
                                return <span key={i} className="star empty">★</span>;
                              }
                            })}
                          </div>
                        ) : '点击评分'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'themes' && (
        <div className="section">
          <h2>主题管理</h2>
          <form onSubmit={handleThemeSubmit} className="form-group">
            <label htmlFor="themeName">主题名称：</label>
            <input
              type="text"
              id="themeName"
              value={newTheme.name}
              onChange={(e) => setNewTheme({ ...newTheme, name: e.target.value })}
            />
            <label htmlFor="themeDescription">主题描述：</label>
            <textarea
              id="themeDescription"
              value={newTheme.description}
              onChange={(e) => setNewTheme({ ...newTheme, description: e.target.value })}
              placeholder="输入主题描述..."
            />
            <button type="submit">创建主题</button>
          </form>
          <div className="themes-list">
            {themes.map(theme => (
              <div key={theme.id} className="theme-card">
                <h3>{theme.name}</h3>
                <p className="description">{theme.description}</p>
                <button onClick={() => handleThemeSelect(theme)}>查看详情</button>
              </div>
            ))}
          </div>
          {selectedTheme && (
            <div className="theme-images">
              <div className="theme-header">
                <h3>{selectedTheme.name} - 主题内包含图片</h3>
                <button className="close-btn" onClick={() => setSelectedTheme(null)}>关闭</button>
              </div>
              <div className="images-grid">
                {selectedTheme.Images && selectedTheme.Images.map(image => (
                  <div key={image.id} className="image-card">
                    <div className="image-header">
                      <img src={`/uploads/${image.filename}`} alt="参考图片" />
                      <button type="button" className="delete-btn" onClick={() => handleRemoveImageFromTheme(image.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
              <h4>从下方图片选择添加到主题</h4>
              <div className="images-grid">
                {/* 过滤掉已经在当前主题中的图片 */}
                {images.filter(image => {
                  return !selectedTheme.Images || !selectedTheme.Images.some(img => img.id === image.id);
                }).map(image => (
                  <div key={image.id} className="image-card">
                    <div className="image-header">
                      <img src={`/uploads/${image.filename}`} alt="AI生成" />
                    </div>
                    <button className="add-to-theme-btn" onClick={() => handleAddImageToTheme(image.id)}>添加到主题</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'search' && (
        <div className="section">
          <h2>检索参考</h2>
          <form onSubmit={handleSearch} className="form-group">
            <label htmlFor="search">搜索提示词：</label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入搜索关键词..."
            />
            <button type="submit">搜索</button>
          </form>
          <div className="search-results">
            <h3>搜索结果</h3>
            <div className="images-grid">
              {searchResults.map(image => (
                <div key={image.id} className="image-card">
                  <div className="image-header">
                    <img src={`/uploads/${image.filename}`} alt="搜索结果" />
                    <button type="button" className="delete-btn" onClick={(e) => handleDeleteImage(e, image.id)}>×</button>
                  </div>
                  {image.Prompt && (
                    <div className="content">
                      <div className="prompt">{image.Prompt.content}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
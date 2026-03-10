import React, { useState, useEffect } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('prompts');
  const [prompts, setPrompts] = useState([]);
  const [images, setImages] = useState([]);
  const [themes, setThemes] = useState([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [newTheme, setNewTheme] = useState({ name: '', description: '' });
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // 获取所有提示词
  useEffect(() => {
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => setPrompts(data));
  }, []);

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

  // 处理评分更新
  const handleScoreUpdate = async (type, id, score) => {
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
      setImages(images.map(image => 
        image.id === id ? updatedData : image
      ));
    }
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
  const handleDeletePrompt = (e, id) => {
    e.preventDefault();
    if (window.confirm('确定要删除这个提示词及其关联的所有图片吗？')) {
      fetch(`/api/prompts/${id}`, {
        method: 'DELETE'
      })
      .then(() => {
        setPrompts(prompts.filter(prompt => prompt.id !== id));
        // 同时从图片列表中删除关联的图片
        const prompt = prompts.find(p => p.id === id);
        if (prompt && prompt.Images) {
          const imageIds = prompt.Images.map(image => image.id);
          setImages(images.filter(image => !imageIds.includes(image.id)));
        }
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
      .then(data => setThemes(data));
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
      // 处理文件上传
      const formData = new FormData();
      formData.append('image', files[0]);
      fetch('/api/images', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(newImageData => {
        setImages([...images, newImageData]);
      });
    }
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
              <div key={prompt.id} className="prompt-item">
                <div className="prompt-header">
                  <p>{prompt.content}</p>
                  <button type="button" className="delete-btn" onClick={(e) => handleDeletePrompt(e, prompt.id)}>×</button>
                </div>
                <div className="score">
                  <label>评分：</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={prompt.score || ''}
                    onChange={(e) => handleScoreUpdate('prompts', prompt.id, parseInt(e.target.value))}
                  />
                </div>
                {prompt.Images && prompt.Images.length > 0 && (
                  <div className="prompt-images">
                    <h4>相关图片：</h4>
                    <div className="images-grid">
                      {prompt.Images.map(image => (
                        <div key={image.id} className="image-card">
                          <div className="image-header">
                            <img src={`/uploads/${image.filename}`} alt="AI生成" />
                            <button type="button" className="delete-btn" onClick={(e) => handleDeleteImage(e, image.id)}>×</button>
                          </div>
                          <div className="content">
                            <div className="score">
                              <label>评分：</label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={image.score || ''}
                                onChange={(e) => handleScoreUpdate('images', image.id, parseInt(e.target.value))}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              {prompts.map(prompt => (
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
          <div className="images-grid">
            {images.map(image => (
              <div key={image.id} className="image-card">
                <div className="image-header">
                  <img src={`/uploads/${image.filename}`} alt="AI生成" />
                  <button type="button" className="delete-btn" onClick={(e) => handleDeleteImage(e, image.id)}>×</button>
                </div>
                <div className="content">
                  {image.Prompt && (
                    <div className="prompt">{image.Prompt.content}</div>
                  )}
                  <div className="score">
                    <label>评分：</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={image.score || ''}
                      onChange={(e) => handleScoreUpdate('images', image.id, parseInt(e.target.value))}
                    />
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
              <h3>{selectedTheme.name} - 参考图片</h3>
              <div className="images-grid">
                {selectedTheme.Images && selectedTheme.Images.map(image => (
                  <div key={image.id} className="image-card">
                    <div className="image-header">
                      <img src={`/uploads/${image.filename}`} alt="参考图片" />
                      <button type="button" className="delete-btn" onClick={(e) => handleDeleteImage(e, image.id)}>×</button>
                    </div>
                  </div>
                ))}
              </div>
              <h4>添加图片到主题</h4>
              <div className="images-grid">
                {images.map(image => (
                  <div key={image.id} className="image-card">
                    <div className="image-header">
                      <img src={`/uploads/${image.filename}`} alt="AI生成" />
                      <button type="button" className="delete-btn" onClick={(e) => handleDeleteImage(e, image.id)}>×</button>
                    </div>
                    <button onClick={() => handleAddImageToTheme(image.id)}>添加到主题</button>
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
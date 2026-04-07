import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'access_token';

function usePrompts(isAuthenticated = true) {
  const [prompts, setPrompts] = useState([]);
  const [unusedPrompts, setUnusedPrompts] = useState([]);

  const fetchPrompts = useCallback(() => {
    if (!isAuthenticated) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/prompts', { headers, credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setPrompts(data));
  }, [isAuthenticated]);

  const fetchUnusedPrompts = useCallback(() => {
    if (!isAuthenticated) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/prompts/unused', { headers, credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setUnusedPrompts(data));
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPrompts();
      fetchUnusedPrompts();
    }
  }, [isAuthenticated, fetchPrompts, fetchUnusedPrompts]);

  const addPrompt = async (content) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    const newPromptData = await response.json();
    setPrompts((prev) => [...prev, newPromptData]);
    fetchUnusedPrompts();
    return newPromptData;
  };

  const deletePrompt = async (id, deleteImages = true) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await fetch(`/api/prompts/${id}?deleteImages=${deleteImages}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    setPrompts((prev) => prev.filter((prompt) => prompt.id !== id));
    fetchUnusedPrompts();
  };

  const updatePromptScore = async (id, score) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch(`/api/prompts/${id}/score`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ score }),
    });
    const updatedData = await response.json();
    setPrompts((prev) => prev.map((prompt) => (prompt.id === id ? updatedData : prompt)));
    return updatedData;
  };

  const updatePromptImages = (imageId, updatedImage) => {
    setPrompts((prev) =>
      prev.map((prompt) => {
        // 如果这个提示词是图片的新关联提示词
        if (prompt.id === updatedImage.promptId) {
          // 创建新的提示词对象，添加图片
          const existingImages = prompt.Images || [];
          const imageExists = existingImages.some((img) => img.id === imageId);

          if (!imageExists) {
            return {
              ...prompt,
              Images: [...existingImages, updatedImage],
            };
          } else {
            // 如果图片已经存在，更新它
            return {
              ...prompt,
              Images: existingImages.map((img) => (img.id === imageId ? updatedImage : img)),
            };
          }
        } else {
          // 对于其他提示词，移除这个图片（如果存在）
          if (prompt.Images) {
            const filteredImages = prompt.Images.filter((img) => img.id !== imageId);
            if (filteredImages.length !== prompt.Images.length) {
              return {
                ...prompt,
                Images: filteredImages,
              };
            }
          }
        }
        return prompt;
      })
    );
  };

  const removeImageFromPrompts = (imageId) => {
    setPrompts((prev) =>
      prev.map((prompt) => {
        if (prompt.Images) {
          return {
            ...prompt,
            Images: prompt.Images.filter((image) => image.id !== imageId),
          };
        }
        return prompt;
      })
    );
  };

  return {
    prompts,
    setPrompts,
    unusedPrompts,
    fetchPrompts,
    fetchUnusedPrompts,
    addPrompt,
    deletePrompt,
    updatePromptScore,
    updatePromptImages,
    removeImageFromPrompts,
  };
}

export default usePrompts;

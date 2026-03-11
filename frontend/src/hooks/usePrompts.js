import { useState, useEffect, useCallback } from 'react';

function usePrompts() {
  const [prompts, setPrompts] = useState([]);
  const [unusedPrompts, setUnusedPrompts] = useState([]);

  const fetchPrompts = useCallback(() => {
    fetch('/api/prompts')
      .then((res) => res.json())
      .then((data) => setPrompts(data));
  }, []);

  const fetchUnusedPrompts = useCallback(() => {
    fetch('/api/prompts/unused')
      .then((res) => res.json())
      .then((data) => setUnusedPrompts(data));
  }, []);

  useEffect(() => {
    fetchPrompts();
    fetchUnusedPrompts();
  }, [fetchPrompts, fetchUnusedPrompts]);

  const addPrompt = async (content) => {
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    const newPromptData = await response.json();
    setPrompts((prev) => [...prev, newPromptData]);
    fetchUnusedPrompts();
    return newPromptData;
  };

  const deletePrompt = async (id, deleteImages = true) => {
    await fetch(`/api/prompts/${id}?deleteImages=${deleteImages}`, {
      method: 'DELETE',
    });
    setPrompts((prev) => prev.filter((prompt) => prompt.id !== id));
    fetchUnusedPrompts();
  };

  const updatePromptScore = async (id, score) => {
    const response = await fetch(`/api/prompts/${id}/score`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score }),
    });
    const updatedData = await response.json();
    setPrompts((prev) => prev.map((prompt) => (prompt.id === id ? updatedData : prompt)));
    return updatedData;
  };

  const updatePromptImages = (imageId, updatedImage) => {
    setPrompts((prev) =>
      prev.map((prompt) => {
        if (prompt.Images) {
          return {
            ...prompt,
            Images: prompt.Images.map((image) => (image.id === imageId ? updatedImage : image)),
          };
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

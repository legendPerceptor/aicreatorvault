import { useState, useEffect, useCallback } from 'react';

function useImages(prompts, { updatePromptImages, removeImageFromPrompts, fetchUnusedPrompts }) {
  const [images, setImages] = useState([]);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [analyzedFilter, setAnalyzedFilter] = useState('all');

  const fetchImages = useCallback(() => {
    let url = '/api/images';
    if (analyzedFilter === 'analyzed') {
      url += '?analyzed=true';
    } else if (analyzedFilter === 'unanalyzed') {
      url += '?analyzed=false';
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => setImages(data));
  }, [analyzedFilter]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const uploadImage = async (formData) => {
    const response = await fetch('/api/images', {
      method: 'POST',
      body: formData,
    });
    const newImageData = await response.json();
    setImages((prev) => [...prev, newImageData]);
    fetchUnusedPrompts();
    return newImageData;
  };

  const deleteImage = async (id) => {
    await fetch(`/api/images/${id}`, {
      method: 'DELETE',
    });
    setImages((prev) => prev.filter((image) => image.id !== id));
    removeImageFromPrompts(id);
    fetchUnusedPrompts();
  };

  const updateImageScore = async (id, score) => {
    const response = await fetch(`/api/images/${id}/score`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score }),
    });
    const updatedData = await response.json();
    setImages((prev) => prev.map((image) => (image.id === id ? updatedData : image)));
    updatePromptImages(id, updatedData);
    return updatedData;
  };

  const updateImagePrompt = async (imageId, promptId) => {
    const response = await fetch(`/api/images/${imageId}/prompt`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ promptId: promptId || null }),
    });
    const updatedImage = await response.json();
    setImages((prev) => prev.map((image) => (image.id === imageId ? updatedImage : image)));
    updatePromptImages(imageId, updatedImage);
    fetchUnusedPrompts();
    return updatedImage;
  };

  const updateImageInList = (imageId, updatedImage) => {
    setImages((prev) => prev.map((image) => (image.id === imageId ? updatedImage : image)));
  };

  const batchAnalyze = async (forceAll = false) => {
    setBatchAnalyzing(true);
    try {
      const response = await fetch('/api/images/batch-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceAll }),
      });
      const result = await response.json();
      fetchImages();
      return result;
    } finally {
      setBatchAnalyzing(false);
    }
  };

  return {
    images,
    setImages,
    fetchImages,
    uploadImage,
    deleteImage,
    updateImageScore,
    updateImagePrompt,
    updateImageInList,
    batchAnalyze,
    batchAnalyzing,
    analyzedFilter,
    setAnalyzedFilter,
  };
}

export default useImages;

import { useState, useEffect, useCallback } from 'react';

function useImages(prompts, { updatePromptImages, removeImageFromPrompts, fetchUnusedPrompts }) {
  const [images, setImages] = useState([]);

  const fetchImages = useCallback(() => {
    fetch('/api/images')
      .then((res) => res.json())
      .then((data) => setImages(data));
  }, []);

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

  return {
    images,
    setImages,
    fetchImages,
    uploadImage,
    deleteImage,
    updateImageScore,
    updateImagePrompt,
    updateImageInList,
  };
}

export default useImages;

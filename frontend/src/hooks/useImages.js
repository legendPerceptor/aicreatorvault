import { useState, useEffect, useCallback } from 'react';
import { getAuthHeader } from '../utils/authHeader';

const TOKEN_KEY = 'access_token';

function useImages(
  prompts,
  { updatePromptImages, removeImageFromPrompts, fetchUnusedPrompts },
  isAuthenticated = true
) {
  const [images, setImages] = useState([]);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [analyzingImageId, setAnalyzingImageId] = useState(null);
  const [analyzedFilter, setAnalyzedFilter] = useState('all');

  const fetchImages = useCallback(() => {
    if (!isAuthenticated) return;

    // Read token directly from sessionStorage to avoid closure issues
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    let url = '/api/images';
    if (analyzedFilter === 'analyzed') {
      url += '?analyzed=true';
    } else if (analyzedFilter === 'unanalyzed') {
      url += '?analyzed=false';
    }
    fetch(url, { headers, credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setImages(data));
  }, [analyzedFilter, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchImages();
    }
  }, [isAuthenticated, fetchImages]);

  const uploadImage = async (formData) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch('/api/images', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData,
    });
    const newImageData = await response.json();
    setImages((prev) => [newImageData, ...prev]);
    fetchUnusedPrompts();
    return newImageData;
  };

  const deleteImage = async (id) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    await fetch(`/api/images/${id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    setImages((prev) => prev.filter((image) => image.id !== id));
    removeImageFromPrompts(id);
    fetchUnusedPrompts();
  };

  const updateImageScore = async (id, score) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch(`/api/images/${id}/score`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify({ score }),
    });
    const updatedData = await response.json();
    setImages((prev) => prev.map((image) => (image.id === id ? updatedData : image)));
    updatePromptImages(id, updatedData);
    return updatedData;
  };

  const updateImagePrompt = async (imageId, promptId) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch(`/api/images/${imageId}/prompt`, {
      method: 'PUT',
      headers,
      credentials: 'include',
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

  const analyzeSingleImage = async (imageId) => {
    setAnalyzingImageId(imageId);
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`/api/images/${imageId}/analyze`, {
        method: 'POST',
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析失败');
      }
      const updatedImage = await response.json();
      setImages((prev) => prev.map((image) => (image.id === imageId ? updatedImage : image)));
      return { success: true, image: updatedImage };
    } catch (error) {
      console.error('分析单张图片失败:', error);
      alert(`分析失败: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setAnalyzingImageId(null);
    }
  };

  const generateImages = async ({ prompt, n, aspect_ratio }) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch('/api/images/generate', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ prompt, n, aspect_ratio }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '生成失败');
    }
    return response.json();
  };

  const batchAnalyze = async (forceAll = false) => {
    setBatchAnalyzing(true);

    let imagesToAnalyze;
    if (forceAll) {
      imagesToAnalyze = images;
    } else {
      imagesToAnalyze = images.filter((img) => !img.description);
    }

    if (imagesToAnalyze.length === 0) {
      setBatchAnalyzing(false);
      return { total: 0, updated: 0, failed: 0, skipped: 0 };
    }

    setBatchProgress({ current: 0, total: imagesToAnalyze.length });

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < imagesToAnalyze.length; i++) {
      const img = imagesToAnalyze[i];
      try {
        const token = sessionStorage.getItem(TOKEN_KEY);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`/api/images/${img.id}/analyze`, {
          method: 'POST',
          headers,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '分析失败');
        }

        const updatedImage = await response.json();
        setImages((prev) => prev.map((image) => (image.id === img.id ? updatedImage : image)));
        updated++;
      } catch (error) {
        console.error(`分析图片 ${img.id} 失败:`, error.message);
        failed++;
      }

      setBatchProgress({ current: i + 1, total: imagesToAnalyze.length });
    }

    setBatchAnalyzing(false);
    setBatchProgress({ current: 0, total: 0 });

    const result = { total: imagesToAnalyze.length, updated, failed, skipped: 0 };
    if (failed > 0) {
      alert(`批量分析完成: 成功 ${updated} 张，失败 ${failed} 张`);
    }
    return result;
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
    analyzeSingleImage,
    analyzingImageId,
    batchAnalyze,
    batchAnalyzing,
    batchProgress,
    analyzedFilter,
    setAnalyzedFilter,
    generateImages,
  };
}

export default useImages;

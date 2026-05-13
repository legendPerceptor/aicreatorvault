import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/authFetch';

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

    let url = '/api/images';
    if (analyzedFilter === 'analyzed') {
      url += '?analyzed=true';
    } else if (analyzedFilter === 'unanalyzed') {
      url += '?analyzed=false';
    }
    authFetch(url)
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setImages(data);
        }
      })
      .catch(() => {});
  }, [analyzedFilter, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchImages();
    }
  }, [isAuthenticated, fetchImages]);

  const uploadImage = async (formData) => {
    const response = await authFetch('/api/images', {
      method: 'POST',
      body: formData,
    });
    const newImageData = await response.json();
    setImages((prev) => [newImageData, ...prev]);
    fetchUnusedPrompts();
    return newImageData;
  };

  const deleteImage = async (id) => {
    await authFetch(`/api/images/${id}`, { method: 'DELETE' });
    setImages((prev) => prev.filter((image) => image.id !== id));
    removeImageFromPrompts(id);
    fetchUnusedPrompts();
  };

  const updateImageScore = async (id, score) => {
    const response = await authFetch(`/api/images/${id}/score`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score }),
    });
    const updatedData = await response.json();
    setImages((prev) => prev.map((image) => (image.id === id ? updatedData : image)));
    updatePromptImages(id, updatedData);
    return updatedData;
  };

  const updateImagePrompt = async (imageId, promptId) => {
    const response = await authFetch(`/api/images/${imageId}/prompt`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
      const response = await authFetch(`/api/images/${imageId}/analyze`, {
        method: 'POST',
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
    const response = await authFetch('/api/images/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        const response = await authFetch(`/api/images/${img.id}/analyze`, {
          method: 'POST',
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

import { useState, useEffect, useCallback } from 'react';

function useImages(prompts, { updatePromptImages, removeImageFromPrompts, fetchUnusedPrompts }) {
  const [images, setImages] = useState([]);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [analyzingImageId, setAnalyzingImageId] = useState(null);
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

  const analyzeSingleImage = async (imageId) => {
    setAnalyzingImageId(imageId);
    try {
      const response = await fetch(`/api/images/${imageId}/analyze`, {
        method: 'POST',
      });
      const updatedImage = await response.json();
      setImages((prev) => prev.map((image) => (image.id === imageId ? updatedImage : image)));
      return { success: true, image: updatedImage };
    } catch (error) {
      console.error('分析单张图片失败:', error);
      return { success: false, error: error.message };
    } finally {
      setAnalyzingImageId(null);
    }
  };

  const batchAnalyze = async (forceAll = false) => {
    setBatchAnalyzing(true);
    setBatchProgress({ current: 0, total: 0 });
    
    try {
      // 先获取需要分析的图片数量
      let imagesToAnalyze;
      if (forceAll) {
        imagesToAnalyze = images;
      } else {
        imagesToAnalyze = images.filter((img) => !img.description);
      }
      
      setBatchProgress({ current: 0, total: imagesToAnalyze.length });
      
      const response = await fetch('/api/images/batch-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceAll }),
      });
      
      const result = await response.json();
      
      // 模拟进度更新
      if (result.total > 0) {
        const progressInterval = setInterval(() => {
          setBatchProgress((prev) => {
            if (prev.current >= result.total) {
              clearInterval(progressInterval);
              return { current: result.total, total: result.total };
            }
            return { ...prev, current: prev.current + 1 };
          });
        }, 300);
        
        // 等待进度完成
        await new Promise(resolve => setTimeout(resolve, result.total * 300 + 500));
      }
      
      fetchImages();
      return result;
    } finally {
      setBatchAnalyzing(false);
      setBatchProgress({ current: 0, total: 0 });
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
    analyzeSingleImage,
    analyzingImageId,
    batchAnalyze,
    batchAnalyzing,
    batchProgress,
    analyzedFilter,
    setAnalyzedFilter,
  };
}

export default useImages;

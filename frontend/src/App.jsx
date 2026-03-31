import React, { useState } from 'react';
import PromptsPage from './pages/PromptsPage';
import ImagesPage from './pages/ImagesPage';
import ThemesPage from './pages/ThemesPage';
import SearchPage from './pages/SearchPage';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';
import ReferenceSearchPage from './pages/ReferenceSearchPage';
import usePrompts from './hooks/usePrompts';
import useImages from './hooks/useImages';
import useThemes from './hooks/useThemes';

function App() {
  const [activeTab, setActiveTab] = useState('prompts');
  const [editingScores, setEditingScores] = useState({});
  const [scoreValues, setScoreValues] = useState({});
  const [pendingImages, setPendingImages] = useState([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const {
    prompts,
    unusedPrompts,
    addPrompt,
    deletePrompt,
    updatePromptScore,
    updatePromptImages,
    removeImageFromPrompts,
    fetchUnusedPrompts,
    fetchPrompts,
  } = usePrompts();

  const {
    images,
    uploadImage,
    deleteImage,
    updateImageScore,
    updateImagePrompt,
    analyzeSingleImage,
    analyzingImageId,
    batchAnalyze,
    batchAnalyzing,
    batchProgress,
    analyzedFilter,
    setAnalyzedFilter,
    generateImages,
  } = useImages(prompts, {
    updatePromptImages,
    removeImageFromPrompts,
    fetchUnusedPrompts,
  });

  const {
    themes,
    selectedTheme,
    setSelectedTheme,
    addTheme,
    addImageToTheme,
    removeImageFromTheme,
  } = useThemes();

  const handleScoreEdit = (type, id) => {
    const currentScore =
      type === 'prompts'
        ? prompts.find((p) => p.id === id)?.score || 0
        : images.find((i) => i.id === id)?.score || 0;

    setScoreValues((prev) => ({
      ...prev,
      [`${type}_${id}`]: currentScore,
    }));

    setEditingScores((prev) => ({
      ...prev,
      [`${type}_${id}`]: true,
    }));
  };

  const handleScoreChange = (type, id, score) => {
    setScoreValues((prev) => ({
      ...prev,
      [`${type}_${id}`]: score,
    }));
  };

  const handleScoreConfirm = async (type, id) => {
    const score = scoreValues[`${type}_${id}`];
    if (score === undefined) return;

    if (type === 'prompts') {
      await updatePromptScore(id, score);
    } else if (type === 'images') {
      await updateImageScore(id, score);
    }

    setEditingScores((prev) => ({
      ...prev,
      [`${type}_${id}`]: false,
    }));

    setScoreValues((prev) => {
      const newValues = { ...prev };
      delete newValues[`${type}_${id}`];
      return newValues;
    });
  };

  const handleScoreCancel = (type, id) => {
    setEditingScores((prev) => ({
      ...prev,
      [`${type}_${id}`]: false,
    }));

    setScoreValues((prev) => {
      const newValues = { ...prev };
      delete newValues[`${type}_${id}`];
      return newValues;
    });
  };

  const handleDeleteImage = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm('确定要删除这张图片吗？');
    if (confirmed) {
      setTimeout(() => {
        deleteImage(id);
      }, 100);
    }
  };

  const handleDeletePrompt = async (e, id, deleteImages = true) => {
    e.preventDefault();
    const confirmMessage = deleteImages
      ? '确定要删除这个提示词及其关联的所有图片吗？'
      : '确定要仅删除这个提示词，保留关联的图片吗？';

    if (window.confirm(confirmMessage)) {
      await deletePrompt(id, deleteImages);
    }
  };

  const handleUploadImage = async (formData) => {
    await uploadImage(formData);
  };

  const handleGenerateImages = async ({ prompt, n, aspect_ratio, autoAnalyze }) => {
    setIsGeneratingImages(true);
    try {
      const result = await generateImages({ prompt, n, aspect_ratio });
      setPendingImages(result.images || []);
    } catch (error) {
      alert(`生成失败: ${error.message}`);
      setPendingImages([]);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleSavePendingImages = async (imgs, prompt, saveMode, autoAnalyze) => {
    if (!imgs || imgs.length === 0) return;

    try {
      for (const img of imgs) {
        const formData = new FormData();
        if (saveMode === 'prompt-and-images') {
          formData.append('prompt', prompt);
        }
        if (!autoAnalyze) {
          formData.append('autoAnalyze', 'false');
        }
        const imgResponse = await fetch(`/temp/${img.filename}`);
        const imgBlob = await imgResponse.blob();
        formData.append('image', imgBlob, img.filename);
        await uploadImage(formData);
      }
      setPendingImages([]);
    } catch (error) {
      alert(`保存失败: ${error.message}`);
    }
  };

  const handleDiscardPendingImages = () => {
    setPendingImages([]);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>AI Creator Vault</h1>
        <p>管理你的 AI 创作资产</p>
      </div>

      <div className="nav">
        <button onClick={() => setActiveTab('prompts')}>提示词管理</button>
        <button onClick={() => setActiveTab('images')}>图片管理</button>
        <button onClick={() => setActiveTab('themes')}>主题管理</button>
        <button onClick={() => setActiveTab('search')}>检索参考</button>
        <button onClick={() => setActiveTab('reference-search')}>🌐 参考图搜索</button>
        <button onClick={() => setActiveTab('graph')}>知识图谱</button>
      </div>

      {activeTab === 'prompts' && (
        <PromptsPage
          prompts={prompts}
          unusedPrompts={unusedPrompts}
          onAddPrompt={addPrompt}
          onDeletePrompt={handleDeletePrompt}
          onUpdateScore={updatePromptScore}
          onDeleteImage={handleDeleteImage}
          editingScores={editingScores}
          scoreValues={scoreValues}
          onScoreEdit={handleScoreEdit}
          onScoreChange={handleScoreChange}
          onScoreConfirm={handleScoreConfirm}
          onScoreCancel={handleScoreCancel}
        />
      )}

      {activeTab === 'images' && (
        <ImagesPage
          images={images}
          prompts={prompts}
          unusedPrompts={unusedPrompts}
          onUploadImage={handleUploadImage}
          onDeleteImage={handleDeleteImage}
          onUpdateImagePrompt={updateImagePrompt}
          onUpdateImageScore={updateImageScore}
          onAnalyzeSingleImage={analyzeSingleImage}
          analyzingImageId={analyzingImageId}
          editingScores={editingScores}
          scoreValues={scoreValues}
          onScoreEdit={handleScoreEdit}
          onScoreChange={handleScoreChange}
          onScoreConfirm={handleScoreConfirm}
          onScoreCancel={handleScoreCancel}
          onBatchAnalyze={batchAnalyze}
          batchAnalyzing={batchAnalyzing}
          batchProgress={batchProgress}
          analyzedFilter={analyzedFilter}
          onAnalyzedFilterChange={setAnalyzedFilter}
          onGenerateImages={handleGenerateImages}
          onSavePendingImages={handleSavePendingImages}
          onDiscardPendingImages={handleDiscardPendingImages}
          pendingImages={pendingImages}
          isGeneratingImages={isGeneratingImages}
        />
      )}

      {activeTab === 'themes' && (
        <ThemesPage
          themes={themes}
          images={images}
          selectedTheme={selectedTheme}
          onSelectTheme={setSelectedTheme}
          onAddTheme={addTheme}
          onAddImageToTheme={addImageToTheme}
          onRemoveImageFromTheme={removeImageFromTheme}
        />
      )}

      {activeTab === 'search' && (
        <SearchPage
          images={images}
          prompts={prompts}
          themes={themes}
          onDeleteImage={handleDeleteImage}
          editingScores={editingScores}
          scoreValues={scoreValues}
          onScoreEdit={handleScoreEdit}
          onScoreChange={handleScoreChange}
          onScoreConfirm={handleScoreConfirm}
          onScoreCancel={handleScoreCancel}
        />
      )}

      {activeTab === 'reference-search' && (
        <ReferenceSearchPage
          themes={themes}
          onImagesAdded={() => {
            // 刷新图片列表
            window.location.reload();
          }}
        />
      )}

      {activeTab === 'graph' && <KnowledgeGraphPage />}
    </div>
  );
}

export default App;

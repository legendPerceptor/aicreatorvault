import React, { useState } from 'react';
import PromptsPage from './pages/PromptsPage';
import ImagesPage from './pages/ImagesPage';
import ThemesPage from './pages/ThemesPage';
import SearchPage from './pages/SearchPage';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';
import ReferenceSearchPage from './pages/ReferenceSearchPage';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useTranslation } from './i18n/useTranslation';
import usePrompts from './hooks/usePrompts';
import useImages from './hooks/useImages';
import useThemes from './hooks/useThemes';
import { getAuthHeader } from './utils/authHeader';
import './App.css';

function AppContent() {
  const [activeTab, setActiveTab] = useState('prompts');
  const [editingScores, setEditingScores] = useState({});
  const [scoreValues, setScoreValues] = useState({});
  const [pendingImages, setPendingImages] = useState([]);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isSavingPending, setIsSavingPending] = useState(false);

  const { user, isAuthenticated, isLoading, logout, checkAuth } = useAuth();
  const { t, toggleLanguage, language } = useTranslation();

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
  } = usePrompts(isAuthenticated);

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
    fetchImages,
  } = useImages(
    prompts,
    {
      updatePromptImages,
      removeImageFromPrompts,
      fetchUnusedPrompts,
    },
    isAuthenticated
  );

  const {
    themes,
    selectedTheme,
    setSelectedTheme,
    addTheme,
    addImageToTheme,
    removeImageFromTheme,
  } = useThemes(isAuthenticated);

  // Reference search state - persists across tab navigation
  const [referenceSearchResults, setReferenceSearchResults] = useState([]);
  const [referenceSearchSelected, setReferenceSearchSelected] = useState([]);
  const [referenceSearchDownloading, setReferenceSearchDownloading] = useState(new Set());
  const [addedImageUrls, setAddedImageUrls] = useState(new Set());

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

    const confirmed = window.confirm(t('app.confirmDeleteImage'));
    if (confirmed) {
      setTimeout(() => {
        deleteImage(id);
      }, 100);
    }
  };

  const handleDeletePrompt = async (e, id, deleteImages = true) => {
    e.preventDefault();
    const confirmMessage = deleteImages
      ? t('app.confirmDeletePromptWithImages')
      : t('app.confirmDeletePromptOnly');

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
      alert(t('app.generationFailed', { error: error.message }));
      setPendingImages([]);
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleSavePendingImages = async (imgs, prompt, saveMode, autoAnalyze) => {
    if (!imgs || imgs.length === 0) return;

    setIsSavingPending(true);
    try {
      let promptId = null;

      // If saving with prompt, create the prompt first and reuse for all images
      if (saveMode === 'prompt-and-images') {
        // Check if prompt already exists
        const existingPrompt = prompts.find((p) => p.content === prompt);
        if (existingPrompt) {
          promptId = existingPrompt.id;
        } else {
          // Create new prompt
          const promptResponse = await fetch('/api/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
            credentials: 'include',
            body: JSON.stringify({ content: prompt }),
          });
          if (!promptResponse.ok) {
            const errorData = await promptResponse.json();
            throw new Error(errorData.error || t('app.createPromptFailed'));
          }
          const newPrompt = await promptResponse.json();
          promptId = newPrompt.id;
        }
      }

      // Upload images with the promptId
      for (const img of imgs) {
        const formData = new FormData();
        if (promptId) {
          formData.append('promptId', promptId);
        }
        if (!autoAnalyze) {
          formData.append('autoAnalyze', 'false');
        }
        const imgResponse = await fetch(`/temp/${img.filename}`);
        const imgBlob = await imgResponse.blob();
        formData.append('image', imgBlob, img.filename);
        await uploadImage(formData);
      }

      // Refresh prompts list to show the new/updated prompt
      if (saveMode === 'prompt-and-images') {
        fetchPrompts();
        fetchUnusedPrompts();
      }

      setPendingImages([]);
    } catch (error) {
      alert(t('app.saveFailed', { error: error.message }));
    } finally {
      setIsSavingPending(false);
    }
  };

  const handleDiscardPendingImages = () => {
    setPendingImages([]);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>{t('app.loading')}</p>
        <style>{`
          .app-loading {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <div>
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
          <div className="user-info">
            <button onClick={toggleLanguage} className="lang-toggle-button" title="Toggle language">
              🌐 {language === 'zh' ? 'EN' : '中'}
            </button>
            <span>{user?.username || user?.email}</span>
            <button onClick={handleLogout} className="logout-button">
              {t('app.logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="nav">
        <button onClick={() => setActiveTab('prompts')}>{t('nav.prompts')}</button>
        <button
          onClick={() => {
            setActiveTab('images');
            fetchImages();
          }}
        >
          {t('nav.images')}
        </button>
        <button onClick={() => setActiveTab('themes')}>{t('nav.themes')}</button>
        <button onClick={() => setActiveTab('search')}>{t('nav.search')}</button>
        <button onClick={() => setActiveTab('reference-search')}>
          🌐 {t('nav.referenceSearch')}
        </button>
        <button onClick={() => setActiveTab('graph')}>{t('nav.knowledgeGraph')}</button>
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
          isSavingPending={isSavingPending}
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
          onImagesAdded={() => {}}
          addedImageUrls={addedImageUrls}
          onAddedImageUrlsChange={setAddedImageUrls}
          searchResults={referenceSearchResults}
          onSearchResultsChange={setReferenceSearchResults}
          selectedImages={referenceSearchSelected}
          onSelectedImagesChange={setReferenceSearchSelected}
          downloadingIds={referenceSearchDownloading}
          onDownloadingIdsChange={setReferenceSearchDownloading}
        />
      )}

      {activeTab === 'graph' && <KnowledgeGraphPage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

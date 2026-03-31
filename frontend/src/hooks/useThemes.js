import { useState, useEffect, useCallback } from 'react';

function useThemes(isAuthenticated = true) {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);

  const fetchThemes = useCallback(() => {
    if (!isAuthenticated) return;
    fetch('/api/themes', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setThemes(data));
  }, [isAuthenticated]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const addTheme = async (name, description) => {
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, description }),
    });
    const newThemeData = await response.json();
    setThemes((prev) => [...prev, newThemeData]);
    return newThemeData;
  };

  const addImageToTheme = async (themeId, imageId) => {
    await fetch(`/api/themes/${themeId}/images`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ imageId }),
    });
    const themesData = await fetch('/api/themes', { credentials: 'include' }).then((res) =>
      res.json()
    );
    setThemes(themesData);
    const updatedTheme = themesData.find((theme) => theme.id === themeId);
    if (updatedTheme) {
      setSelectedTheme(updatedTheme);
    }
  };

  const removeImageFromTheme = async (themeId, imageId) => {
    const response = await fetch(`/api/themes/${themeId}/images/${imageId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (response.ok) {
      const themesData = await fetch('/api/themes', { credentials: 'include' }).then((res) =>
        res.json()
      );
      setThemes(themesData);
      const updatedTheme = themesData.find((theme) => theme.id === themeId);
      if (updatedTheme) {
        setSelectedTheme(updatedTheme);
      }
    }
  };

  return {
    themes,
    selectedTheme,
    setSelectedTheme,
    fetchThemes,
    addTheme,
    addImageToTheme,
    removeImageFromTheme,
  };
}

export default useThemes;

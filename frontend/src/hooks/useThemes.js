import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'access_token';

function useThemes(isAuthenticated = true) {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);

  const fetchThemes = useCallback(() => {
    if (!isAuthenticated) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/themes', { headers, credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setThemes(data));
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchThemes();
    }
  }, [isAuthenticated, fetchThemes]);

  const addTheme = async (name, description) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetch('/api/themes', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ name, description }),
    });
    const newThemeData = await response.json();
    setThemes((prev) => [...prev, newThemeData]);
    return newThemeData;
  };

  const addImageToTheme = async (themeId, imageId) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    await fetch(`/api/themes/${themeId}/images`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ imageId }),
    });
    const themesData = await fetch('/api/themes', { headers, credentials: 'include' }).then((res) =>
      res.json()
    );
    setThemes(themesData);
    const updatedTheme = themesData.find((theme) => theme.id === themeId);
    if (updatedTheme) {
      setSelectedTheme(updatedTheme);
    }
  };

  const removeImageFromTheme = async (themeId, imageId) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await fetch(`/api/themes/${themeId}/images/${imageId}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (response.ok) {
      const themesData = await fetch('/api/themes', { headers, credentials: 'include' }).then(
        (res) => res.json()
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

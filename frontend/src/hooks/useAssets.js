import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:3001/api';

export function useAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAssets = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.type) {
        params.append('type', filters.type);
      }
      if (filters.limit) {
        params.append('limit', filters.limit);
      }
      if (filters.offset) {
        params.append('offset', filters.offset);
      }

      const response = await fetch(`${API_BASE}/assets?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAssets(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching assets:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getAsset = useCallback(async (id, includeRelationships = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = includeRelationships ? '?relationships=true' : '';
      const response = await fetch(`${API_BASE}/assets/${id}${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching asset:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createAsset = useCallback(async (assetData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create asset');
      }

      const data = await response.json();
      setAssets((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error creating asset:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAsset = useCallback(async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAssets((prev) => prev.map((asset) => (asset.id === id ? data : asset)));
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error updating asset:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAsset = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/assets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setAssets((prev) => prev.filter((asset) => asset.id !== id));
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting asset:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deriveAsset = useCallback(async (parentId, file, derivedType, description) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('image', file);
      }
      formData.append('derivedType', derivedType);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`${API_BASE}/assets/${parentId}/derive`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to derive asset');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error deriving asset:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadImageAsset = useCallback(async (file, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (options.parentId) {
        formData.append('parentId', options.parentId);
      }
      if (options.derivedType) {
        formData.append('derivedType', options.derivedType);
      }
      if (options.promptId) {
        formData.append('promptId', options.promptId);
      }
      if (options.score !== undefined) {
        formData.append('score', options.score);
      }
      if (options.description) {
        formData.append('description', options.description);
      }

      const response = await fetch(`${API_BASE}/assets/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();
      setAssets((prev) => [...prev, data]);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error uploading image:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    assets,
    loading,
    error,
    fetchAssets,
    getAsset,
    createAsset,
    updateAsset,
    deleteAsset,
    deriveAsset,
    uploadImageAsset,
  };
}

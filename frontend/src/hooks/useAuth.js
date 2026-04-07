import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function useAuth() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // First, try to refresh the access token using the httpOnly cookie
      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      let token = null;
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        token = refreshData.accessToken;
        setAccessToken(token);
      }

      // If we have a token, use it to get the current user
      if (token) {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          setUser(null);
          setAccessToken(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('[useAuth] Auth check failed:', err);
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const register = useCallback(async (username, email, password) => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setUser(data.user);
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[useAuth] Logout error:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        setUser(null);
        setAccessToken(null);
        return false;
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      return data.accessToken;
    } catch (err) {
      console.error('[useAuth] Token refresh failed:', err);
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  return {
    user,
    setUser,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshToken,
    checkAuth,
  };
}

export default useAuth;

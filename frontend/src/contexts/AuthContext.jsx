import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Save tokens to storage whenever they change
  useEffect(() => {
    if (accessToken) {
      sessionStorage.setItem(TOKEN_KEY, accessToken);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  }, [accessToken]);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      let token = sessionStorage.getItem(TOKEN_KEY);
      let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

      // First, try to refresh the access token using the httpOnly cookie
      let refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        token = refreshData.accessToken;
        setAccessToken(token);
      } else if (refreshToken) {
        // Cookie refresh failed, try using localStorage refresh token
        refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          token = refreshData.accessToken;
          setAccessToken(token);
        }
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
      console.error('[Auth] Auth check failed:', err);
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
      // Store refresh token in localStorage as backup
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
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
      // Store refresh token in localStorage as backup
      if (data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
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
      console.error('[Auth] Logout error:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }, []);

  const value = {
    user,
    setUser,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

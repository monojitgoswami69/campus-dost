import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Storage keys
const TOKEN_STORAGE_KEY = 'admin_token';           // JWT token
const USER_INFO_KEY = 'admin_user_info';           // Basic user info (username, role)
const REMEMBER_ME_KEY = 'remember_me';             // Remember me preference
const REMEMBERED_USERNAME_KEY = 'remembered_username'; // Just username for form pre-fill

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Perform login API call
   */
  const performLogin = useCallback(async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        return { success: true, user: data.user };
      } else {
        return { success: false, error: data.detail || 'Login failed', status: response.status };
      }
    } catch (error) {
      console.error('Login request failed:', error);
      return { success: false, error: 'Network error. Please check if backend is running.', isNetworkError: true };
    }
  }, []);

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      // Check for existing token in sessionStorage or localStorage
      let existingToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      let userInfo = sessionStorage.getItem(USER_INFO_KEY);
      
      // If not in session, check local storage (remember me)
      if (!existingToken) {
        existingToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        userInfo = localStorage.getItem(USER_INFO_KEY);
      }
      
      if (existingToken && userInfo) {
        // We have an active session
        try {
          const userData = JSON.parse(userInfo);
          setToken(existingToken);
          setUser(userData);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } catch {
          // Invalid data, clear it
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          sessionStorage.removeItem(USER_INFO_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_INFO_KEY);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, [performLogin]);

  /**
   * Listen for token expiration events from API service
   */
  useEffect(() => {
    const handleAuthExpired = async () => {
      console.log('Token expired, logging out...');
      
      // Force logout
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      
      // Clear session storage
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(USER_INFO_KEY);
      
      // Clear local storage
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_INFO_KEY);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [performLogin]);

  /**
   * Login with username and password
   * @param {string} username 
   * @param {string} password 
   * @param {boolean} rememberMe - If true, store credentials for auto-login on next visit
   */
  const login = async (username, password, rememberMe = false) => {
    try {
      const result = await performLogin(username, password);

      if (result.success) {
        const userData = result.user;
        const newToken = userData.token;
        
        // Always store token in sessionStorage (cleared on tab/browser close)
        sessionStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        sessionStorage.setItem(USER_INFO_KEY, JSON.stringify({
          username: userData.username,
          role: userData.role
        }));
        
        // Handle "remember me" - store token for auto-login
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, 'true');
          localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
          localStorage.setItem(USER_INFO_KEY, JSON.stringify({
            username: userData.username,
            role: userData.role
          }));
          localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
        } else {
          localStorage.setItem(REMEMBER_ME_KEY, 'false');
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          localStorage.removeItem(USER_INFO_KEY);
          // Still remember username for convenience (just pre-fills form)
          localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
        }
        
        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check if backend is running.' };
    }
  };

  /**
   * Logout - clear all session data
   */
  const logout = async () => {
    try {
      // Optionally notify server (not strictly necessary with JWT)
      await fetch(`${API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
    } catch (e) {
      // Ignore network errors on logout
    }
    
    // Clear all auth state
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    
    // Clear session storage (token)
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_INFO_KEY);
    
    // Clear remembered token (but keep remember_me preference for UX)
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    
    return { success: true };
  };

  /**
   * Get the current JWT token
   */
  const getToken = useCallback(() => {
    return token || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }, [token]);

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

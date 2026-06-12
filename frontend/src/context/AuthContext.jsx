import React, { createContext, useState, useEffect } from 'react';
import api, { setAccessToken, getAccessToken } from '../services/api';
import axios from 'axios';

export const AuthContext = createContext(null);

// Decodes standard JWT payload without external dependencies
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize Auth state: check localStorage token or attempt cookie-based silent refresh
  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        const decoded = decodeToken(token);
        if (decoded && decoded.exp * 1000 > Date.now()) {
          setUser({
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          });
          setIsAuthenticated(true);
        } else {
          // Access token expired, attempt refresh
          try {
            const response = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
            const { accessToken } = response.data;
            setAccessToken(accessToken);
            const newDecoded = decodeToken(accessToken);
            setUser({
              id: newDecoded.userId,
              email: newDecoded.email,
              role: newDecoded.role,
            });
            setIsAuthenticated(true);
          } catch (err) {
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } else {
        // No local token, try refreshing (user might have active refresh cookie)
        try {
          const response = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
          const { accessToken } = response.data;
          setAccessToken(accessToken);
          const decoded = decodeToken(accessToken);
          setUser({
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          });
          setIsAuthenticated(true);
        } catch (err) {
          // Silence refresh failure if user isn't authenticated
          setAccessToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Listen for interceptor-triggered logout events
  useEffect(() => {
    const handleForceLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
      setAccessToken(null);
    };

    window.addEventListener('auth-logout', handleForceLogout);
    return () => {
      window.removeEventListener('auth-logout', handleForceLogout);
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.post('/api/auth/login', { email, password });
      const { accessToken, user: userData } = response.data;
      setAccessToken(accessToken);
      setUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (email, password, role) => {
    setError(null);
    try {
      const response = await api.post('/api/auth/register', { email, password, role });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err.message);
    } finally {
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/api/auth/change-password', { currentPassword, newPassword });
      // Change password invalidates refresh session, so we sign out
      setAccessToken(null);
      setUser(null);
      setIsAuthenticated(false);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Password change failed.';
      throw new Error(msg);
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Forgot password request failed.';
      throw new Error(msg);
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const response = await api.post('/api/auth/reset-password', { email, otp, newPassword });
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Password reset failed.';
      throw new Error(msg);
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

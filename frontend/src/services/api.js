import axios from 'axios';

// Create API axios instance
const api = axios.create({
  // IF USING VITE PROXY: Change this to '/api' or leave it blank if your proxy handles the prefix.
  // If not using a proxy, keep 'http://localhost:4000' but ensure your refresh call matches.
  baseURL: 'http://localhost:4000', 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

// In-memory token cache mirroring localStorage
let _accessToken = localStorage.getItem('accessToken') || null;
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setAccessToken = (token) => {
  _accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

export const getAccessToken = () => _accessToken;

// 1. Request Interceptor (Inject Bearer Token)
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor (Handle 401 & Token Refresh) - ONLY ONE INSTANCE
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops if the refresh endpoint itself returns a 401
    if (originalRequest.url && originalRequest.url.includes('/auth/refresh-token')) {
      setAccessToken(null);
      return Promise.reject(error);
    }

    // Skip token rotation if the login request failed
    if (originalRequest.url && originalRequest.url.includes('/auth/login')) {
      return Promise.reject(error);
    }

    // Attempt token rotation on 401 Unauthorized failures
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use the instance or absolute URL so it matches your backend configuration
        const response = await axios.post('http://localhost:4000/api/auth/refresh-token', {}, { withCredentials: true });
        const { accessToken } = response.data;
        
        setAccessToken(accessToken);
        processQueue(null, accessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        setAccessToken(null);
        
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
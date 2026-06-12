import axios from 'axios';

// Create API axios instance
const api = axios.create({
  baseURL: '', // Vite proxy configuration forwards /api requests to port 5000
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Necessary for HttpOnly refresh-token cookie transmission
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

/**
 * Update the stored access token in memory and local storage.
 * @param {string|null} token 
 */
export const setAccessToken = (token) => {
  _accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

/**
 * Retrieve the active access token.
 * @returns {string|null}
 */
export const getAccessToken = () => _accessToken;

// Intercept requests to inject the Bearer authorization header
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

// Intercept responses to intercept 401 Unauthorized errors and trigger token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If refresh endpoint fails, clear token and notify auth provider
    if (originalRequest.url && originalRequest.url.includes('/api/auth/refresh-token')) {
      setAccessToken(null);
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
        // Post request to backend refresh-token endpoint
        const response = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
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
        
        // Dispatch custom global event to notify AuthContext to sign out the user
        window.dispatchEvent(new Event('auth-logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

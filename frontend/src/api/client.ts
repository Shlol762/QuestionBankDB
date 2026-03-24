import axios from 'axios';
import toast from 'react-hot-toast';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '', // Empty string makes Axios use the current origin (the Vite dev server, which will then proxy to the backend)
});

// Add a request interceptor to include the JWT token in all requests
client.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add a response interceptor to handle session expiry (401)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      toast.error('Session expired. Please sign in again.');
      sessionStorage.removeItem('token');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export const getMe = () => client.get('/auth/me');

export default client;

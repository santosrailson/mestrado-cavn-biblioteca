import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { camelizeKeys, decamelizeKeys } from 'humps';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api/v1' : 'http://localhost:8000/api/v1');

export const getApiUrl = () => API_URL;

let isRefreshing = false;
let failedQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

const convertToCamelCase = (data: unknown): unknown => {
  if (data && typeof data === 'object') {
    return camelizeKeys(data);
  }
  return data;
};

api.interceptors.request.use((config) => {
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data = decamelizeKeys(config.data);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    let data = response.data;

    // Converte paginação DRF para formato PaginatedResponse (em português)
    if (
      data &&
      typeof data === 'object' &&
      !Array.isArray(data) &&
      'results' in data &&
      'count' in data
    ) {
      const params = response.config.params || {};
      const page = Number(params.page) || 1;
      const limit = Number(params.limit) || 20;
      const total = data.count || 0;
      const totalPaginas = limit > 0 ? Math.ceil(total / limit) : 1;
      data = {
        dados: data.results,
        total,
        pagina: page,
        limite: limit,
        totalPaginas,
        temProxima: !!data.next,
        temAnterior: !!data.previous,
      };
    }

    response.data = convertToCamelCase(data);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(originalRequest)),
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Cookie cavn_refresh é enviado automaticamente (withCredentials: true)
        await axios.post(`${API_URL}/auth/refresh/`, {}, { withCredentials: true });
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

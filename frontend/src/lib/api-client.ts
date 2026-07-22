import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api',
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type TokenProvider = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (access: string, refresh: string) => void;
  clearTokens: () => void;
};

let tokenProvider: TokenProvider = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  clearTokens: () => {},
};

export function configureTokens(provider: TokenProvider) {
  tokenProvider = provider;
}

let isRefreshing = false;
const retriedRequests = new WeakSet<InternalAxiosRequestConfig>();
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: DynamicValue) => void;
}> = [];

function processQueue(error: DynamicValue, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenProvider.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

function normalizeIds(obj: DynamicValue): DynamicValue {
  if (Array.isArray(obj)) {
    return obj.map(normalizeIds);
  }
  if (obj && typeof obj === 'object') {
    const result: DynamicRecord = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key === '_id' && typeof value === 'string') {
        result.id = value;
      }
      result[key] = normalizeIds(value);
    }
    return result;
  }
  return obj;
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = normalizeIds(response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !retriedRequests.has(originalRequest) &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      retriedRequests.add(originalRequest);
      isRefreshing = true;

      try {
        const refreshToken = tokenProvider.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api'}/auth/refresh`,
          { refreshToken },
        );

        const newAccessToken = data.data.accessToken;
        const newRefreshToken = data.data.refreshToken;

        tokenProvider.setTokens(newAccessToken, newRefreshToken);

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError instanceof Error ? refreshError : String(refreshError), null);
        tokenProvider.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export function mapApiError<T>(error: T): {
  success: false;
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
} {
  if (error && typeof error === 'object' && !Array.isArray(error)) {
    const data: DynamicRecord = Object.fromEntries(Object.entries(error));
    if (data.success === false && typeof data.statusCode === 'number' && typeof data.message === 'string') {
      const errors = data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)
        ? Object.fromEntries(Object.entries(data.errors).filter((entry) => Array.isArray(entry[1]) && entry[1].every((item) => typeof item === 'string')))
        : undefined;
      return {
        success: false,
        statusCode: data.statusCode,
        message: data.message,
        errors,
      };
    }
  }
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;
    const data: DynamicRecord | undefined = responseData && typeof responseData === 'object' && !Array.isArray(responseData)
      ? Object.fromEntries(Object.entries(responseData))
      : undefined;
    const message = typeof data?.message === 'string' ? data.message : undefined;
    const errors = data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)
      ? Object.fromEntries(Object.entries(data.errors).filter((entry) => Array.isArray(entry[1]) && entry[1].every((item) => typeof item === 'string')))
      : undefined;
    return {
      success: false,
      statusCode: error.response?.status || 500,
      message: message || error.message || 'An unexpected error occurred',
      errors,
    };
  }
  return {
    success: false,
    statusCode: 500,
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}

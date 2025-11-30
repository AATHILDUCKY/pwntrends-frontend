"use client";

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  withCredentials: false
});

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

function setTokens(access: string, refresh?: string | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", access);
  if (refresh) {
    localStorage.setItem("refresh_token", refresh);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error as any).config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      (originalRequest as any)._retry = true;
      isRefreshing = true;

      const refresh = getRefreshToken();

      if (!refresh) {
        clearTokens();
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(
          (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000") +
            "/auth/refresh",
          null,
          {
            params: { token: refresh }
          }
        );
        const newAccess = res.data.access_token as string;
        const newRefresh = res.data.refresh_token as string;
        setTokens(newAccess, newRefresh);
        (api.defaults.headers.common as any)["Authorization"] =
          "Bearer " + newAccess;
        processQueue(null, newAccess);
        isRefreshing = false;
        originalRequest.headers["Authorization"] = "Bearer " + newAccess;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        isRefreshing = false;
        clearTokens();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
export { setTokens, getAccessToken, getRefreshToken };

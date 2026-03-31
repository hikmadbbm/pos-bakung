import axios from "axios";

const BASE = '/api';

const apiClient = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Handle FormData
  if (config.data instanceof FormData) {
    if (config.headers['Content-Type']) {
      delete config.headers['Content-Type'];
    }
  }

  return config;
});

export const api = {
  get: (url, options = {}) => apiClient.get(url, options).then((res) => res.data),
  post: (url, data, options = {}) => apiClient.post(url, data, options).then((res) => res.data),
  put: (url, data, options = {}) => apiClient.put(url, data, options).then((res) => res.data),
  patch: (url, data, options = {}) => apiClient.patch(url, data, options).then((res) => res.data),
  delete: (url, options = {}) => apiClient.delete(url, options).then((res) => res.data),
};

export function setAuth(token, user) {
  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

export function getAuth() {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

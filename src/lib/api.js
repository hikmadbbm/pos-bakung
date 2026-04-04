import axios from "axios";

const BASE = '/api';

const apiClient = axios.create({
  baseURL: BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Decode a JWT without verifying (client-side only).
 * Returns null if token is malformed or expired.
 */
export function decodeAndValidateJwt(token) {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    // Check expiry
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      return null; // Token has expired
    }
    return decoded;
  } catch {
    return null;
  }
}

// ── Request Interceptor ──────────────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");

    if (token) {
      // Validate token expiry before sending request
      const decoded = decodeAndValidateJwt(token);
      if (!decoded) {
        // Token expired or malformed — clear storage and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(new Error("Session expired. Please log in again."));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  // Handle FormData — let browser set Content-Type with boundary
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

// ── Response Interceptor (Global 401 / 403 handler) ────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined") {
      const status = error?.response?.status;

      if (status === 401) {
        // Unauthorized — token invalid/expired on server side
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Avoid redirect loop if we're already on the login page
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

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

import axios from "axios";
import { csrfManager } from "../features/auth/services/csrf.manager";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15_000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(async (config) => {
  const method = config.method?.toUpperCase();
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (method && mutatingMethods.includes(method)) {
    try {
      const token = await csrfManager.fetchToken();
      if (token) {
        config.headers["x-csrf-token"] = token;
      }
    } catch (error) {
      console.warn("No se pudo obtener el token CSRF para la petición:", error);
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si hay error de CSRF (403) o sesión inválida, limpiar caché del token CSRF
    if (error.response?.status === 403) {
      csrfManager.clear();
    }
    return Promise.reject(error);
  },
);

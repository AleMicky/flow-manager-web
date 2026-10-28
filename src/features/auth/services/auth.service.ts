import { api } from "../../../services/api";
import { AUTH_ENDPOINTS } from "../constants/auth.endpoints";
import { csrfManager } from "./csrf.manager";
import type {
  AuthUser,
  CsrfResponse,
  LogoutResponse,
  SessionResponse,
} from "../types/auth.types";

export const authService = {
  /**
   * Obtiene la URL completa del endpoint de login del BFF para redirigir al IdP
   */
  getLoginUrl(): string {
    const base = import.meta.env.VITE_API_URL || "/api";
    return `${base}${AUTH_ENDPOINTS.LOGIN}`;
  },

  /**
   * Redirige al navegador al endpoint de login OIDC de la API/BFF
   */
  login(): void {
    window.location.href = this.getLoginUrl();
  },

  /**
   * Consulta el estado de la sesión activa en el BFF
   * Endpoint: GET /api/auth/session
   */
  async getSession(): Promise<SessionResponse> {
    const response = await api.get<SessionResponse>(AUTH_ENDPOINTS.SESSION);
    return response.data;
  },

  /**
   * Obtiene los datos del perfil del usuario autenticado
   * Endpoint: GET /api/auth/me
   */
  async getMe(): Promise<AuthUser> {
    const response = await api.get<AuthUser>(AUTH_ENDPOINTS.ME);
    return response.data;
  },

  /**
   * Obtiene y almacena en memoria el token CSRF para peticiones mutantes
   * Endpoint: GET /api/auth/csrf
   */
  async getCsrf(): Promise<CsrfResponse> {
    const response = await api.get<CsrfResponse>(AUTH_ENDPOINTS.CSRF);
    csrfManager.setToken(response.data.csrfToken);
    return response.data;
  },

  /**
   * Cierra la sesión en el BFF y gestiona la redirección OIDC
   * Endpoint: POST /api/auth/logout
   */
  async logout(): Promise<LogoutResponse> {
    try {
      const response = await api.post<LogoutResponse>(AUTH_ENDPOINTS.LOGOUT);
      csrfManager.clear();

      if (response.data?.logoutUrl) {
        window.location.href = response.data.logoutUrl;
        return response.data;
      }
    } catch (error) {
      console.error("Error al cerrar sesión en el BFF:", error);
      csrfManager.clear();
    }

    window.location.href = "/login";
    return {};
  },
};

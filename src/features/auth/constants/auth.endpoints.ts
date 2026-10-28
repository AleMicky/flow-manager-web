export const AUTH_ENDPOINTS = {
  /** Inicia el flujo de autenticación OIDC redirigiendo a Keycloak */
  LOGIN: "/auth/login",
  /** Endpoint receptor de Keycloak con el authorization code y state */
  CALLBACK: "/auth/callback",
  /** Retorna los datos del usuario autenticado */
  ME: "/auth/me",
  /** Verifica si la sesión está activa y retorna los datos básicos */
  SESSION: "/auth/session",
  /** Retorna el token CSRF para proteger peticiones mutantes (POST, PUT, DELETE) */
  CSRF: "/auth/csrf",
  /** Cierra la sesión en el BFF y retorna la URL de cierre OIDC de Keycloak */
  LOGOUT: "/auth/logout",
} as const;

export const AUTH_QUERY_KEYS = {
  all: ["auth"] as const,
  session: () => [...AUTH_QUERY_KEYS.all, "session"] as const,
  me: () => [...AUTH_QUERY_KEYS.all, "me"] as const,
  csrf: () => [...AUTH_QUERY_KEYS.all, "csrf"] as const,
} as const;

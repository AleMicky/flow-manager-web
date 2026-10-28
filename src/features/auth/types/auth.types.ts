export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  name?: string;
  roles: string[];
}

export interface SessionResponse {
  authenticated: boolean;
  user: AuthUser;
}

export interface CsrfResponse {
  csrfToken: string;
}

export interface LogoutResponse {
  logoutUrl?: string;
}

export interface AuthErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}

export type AuthStatus = "authenticated" | "unauthenticated" | "loading";

import { create } from "zustand";
import { authService } from "../features/auth/services/auth.service";
import type { AuthUser } from "../features/auth/types/auth.types";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  checkSession: () => Promise<boolean>;
  login: () => void;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authService.getSession();
      if (session.authenticated && session.user) {
        set({
          user: session.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        // Intentar precargar el token CSRF para peticiones posteriores
        authService.getCsrf().catch(() => {});

        return true;
      }

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return false;
    } catch (err: unknown) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: err instanceof Error ? err.message : "No authenticated session",
      });
      return false;
    }
  },

  login: () => {
    authService.login();
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: Boolean(user),
    });
  },
}));

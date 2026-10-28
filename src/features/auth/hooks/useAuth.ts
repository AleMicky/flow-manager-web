import { useCallback } from "react";
import { useAuthStore } from "../../../stores/auth.store";

/**
 * Hook integral de autenticación con utilidades de roles y permisos
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    checkSession,
    login,
    logout,
    setUser,
  } = useAuthStore();

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user?.roles) return false;
      return user.roles.includes(role);
    },
    [user],
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!user?.roles) return false;
      return roles.some((role) => user.roles.includes(role));
    },
    [user],
  );

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    checkSession,
    login,
    logout,
    setUser,
    hasRole,
    hasAnyRole,
  };
}

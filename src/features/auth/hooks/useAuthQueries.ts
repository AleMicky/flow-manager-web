import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AUTH_QUERY_KEYS } from "../constants/auth.endpoints";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../../../stores/auth.store";

/**
 * Hook para consultar el estado de la sesión activa en el BFF (/auth/session)
 */
export function useSessionQuery(options?: { enabled?: boolean }) {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.session(),
    queryFn: async () => {
      const data = await authService.getSession();
      if (data.authenticated && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
      return data;
    },
    staleTime: 60_000,
    retry: false,
    enabled: options?.enabled,
  });
}

/**
 * Hook para consultar los datos del usuario autenticado (/auth/me)
 */
export function useCurrentUserQuery(options?: { enabled?: boolean }) {
  const setUser = useAuthStore((s) => s.setUser);

  return useQuery({
    queryKey: AUTH_QUERY_KEYS.me(),
    queryFn: async () => {
      const user = await authService.getMe();
      setUser(user);
      return user;
    },
    staleTime: 60_000,
    retry: false,
    enabled: options?.enabled,
  });
}

/**
 * Hook para consultar y precargar el token CSRF (/auth/csrf)
 */
export function useCsrfQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.csrf(),
    queryFn: () => authService.getCsrf(),
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: options?.enabled,
  });
}

/**
 * Mutación para cerrar sesión en el BFF y Keycloak (/auth/logout)
 */
export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const logoutStore = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: () => logoutStore(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

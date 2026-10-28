import { useQuery } from "@tanstack/react-query";
import { KEYCLOAK_ADMIN_QUERY_KEYS } from "../constants/keycloak-admin.endpoints";
import { keycloakAdminService } from "../services/keycloak-admin.service";
import type {
  QueryKeycloakGroupsParams,
  QueryKeycloakRolesParams,
  QueryKeycloakUsersParams,
} from "../types/keycloak-admin.types";

// ==========================================
// USUARIOS
// ==========================================

export function useKeycloakUsersQuery(params?: QueryKeycloakUsersParams) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.users(
      params as Record<string, unknown>,
    ),
    queryFn: () => keycloakAdminService.getUsers(params),
    staleTime: 30_000,
    retry: false,
  });
}

export function useKeycloakUserDetailQuery(userId?: string, enabled = true) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.userDetail(userId ?? ""),
    queryFn: () => keycloakAdminService.getUserById(userId!),
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useKeycloakUserRolesQuery(userId?: string, enabled = true) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.userRoles(userId ?? ""),
    queryFn: () => keycloakAdminService.getUserRoles(userId!),
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

export function useKeycloakUserGroupsQuery(userId?: string, enabled = true) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.userGroups(userId ?? ""),
    queryFn: () => keycloakAdminService.getUserGroups(userId!),
    enabled: Boolean(userId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

// ==========================================
// ROLES
// ==========================================

export function useKeycloakCandidateRolesQuery(
  params?: QueryKeycloakRolesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.candidateRoles(
      params as Record<string, unknown>,
    ),
    queryFn: () => keycloakAdminService.getCandidateRoles(params),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useKeycloakRealmRolesQuery(
  params?: QueryKeycloakRolesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.realmRoles(
      params as Record<string, unknown>,
    ),
    queryFn: () => keycloakAdminService.getRealmRoles(params),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useKeycloakClientRolesQuery(
  params?: QueryKeycloakRolesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.clientRoles(
      params as Record<string, unknown>,
    ),
    queryFn: () => keycloakAdminService.getClientRoles(params),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useKeycloakUsersByRoleQuery(
  roleName?: string,
  params?: { first?: number; max?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.usersByRole(
      roleName ?? "",
      params as Record<string, unknown>,
    ),
    queryFn: () => keycloakAdminService.getUsersByRole(roleName!, params),
    enabled: Boolean(roleName) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

// ==========================================
// GRUPOS
// ==========================================

export function useKeycloakGroupsQuery(
  params?: QueryKeycloakGroupsParams,
  enabled = true,
) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.groups(
      params as Record<string, unknown>,
    ),
    queryFn: () => keycloakAdminService.getGroups(params),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useKeycloakGroupDetailQuery(groupId?: string, enabled = true) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.groupDetail(groupId ?? ""),
    queryFn: () => keycloakAdminService.getGroupById(groupId!),
    enabled: Boolean(groupId) && enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useKeycloakGroupMembersQuery(
  groupId?: string,
  params?: { first?: number; max?: number },
  enabled = true,
) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.groupMembers(
      groupId ?? "",
      params as Record<string, unknown>,
    ),
    queryFn: () => keycloakAdminService.getGroupMembers(groupId!, params),
    enabled: Boolean(groupId) && enabled,
    staleTime: 30_000,
    retry: false,
  });
}

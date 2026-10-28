import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KEYCLOAK_ADMIN_QUERY_KEYS } from "../constants/keycloak-admin.endpoints";
import { keycloakAdminService } from "../services/keycloak-admin.service";
import type {
  CreateKeycloakGroupPayload,
  QueryKeycloakGroupsParams,
  QueryKeycloakRolesParams,
  QueryKeycloakUsersParams,
  UpdateKeycloakGroupPayload,
  UpsertTaskAssignmentPayload,
} from "../types/keycloak-admin.types";

// ==========================================
// USUARIOS: QUERIES Y ASIGNACIÓN DE GRUPOS
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

export function useAssignUserToGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
      keycloakAdminService.assignUserToGroup(userId, groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.all,
      });
    },
  });
}

export function useRemoveUserFromGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
      keycloakAdminService.removeUserFromGroup(userId, groupId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.all,
      });
    },
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
// GRUPOS: QUERIES Y MUTATIONS
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

export function useCreateKeycloakGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateKeycloakGroupPayload) =>
      keycloakAdminService.createGroup(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.all,
      });
    },
  });
}

export function useUpdateKeycloakGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateKeycloakGroupPayload;
    }) => keycloakAdminService.updateGroup(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.all,
      });
    },
  });
}

export function useDeleteKeycloakGroupMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => keycloakAdminService.deleteGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.all,
      });
    },
  });
}

// ==========================================
// ASIGNACIÓN DE TAREAS BPMN (FLOWABLE <-> KEYCLOAK)
// ==========================================

export function useProcessTaskAssignmentsQuery(
  processDefinitionKey?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.processTaskAssignments(
      processDefinitionKey ?? "",
    ),
    queryFn: () =>
      keycloakAdminService.getProcessTaskAssignments(processDefinitionKey!),
    enabled: Boolean(processDefinitionKey) && enabled,
    staleTime: 15_000,
    retry: false,
  });
}

export function useUpsertTaskAssignmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpsertTaskAssignmentPayload) =>
      keycloakAdminService.upsertTaskAssignment(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.all,
      });
    },
  });
}

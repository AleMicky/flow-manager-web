import { api } from "../../../services/api";
import { KEYCLOAK_ADMIN_ENDPOINTS } from "../constants/keycloak-admin.endpoints";
import type {
  CreateKeycloakGroupPayload,
  KeycloakAdminUser,
  KeycloakCandidateRole,
  KeycloakGroupRepresentation,
  KeycloakPaginatedUsers,
  KeycloakRoleRepresentation,
  KeycloakUserRolesResponse,
  QueryKeycloakGroupsParams,
  QueryKeycloakRolesParams,
  QueryKeycloakUsersParams,
  UpdateKeycloakGroupPayload,
} from "../types/keycloak-admin.types";

export const keycloakAdminService = {
  // ==========================================
  // USUARIOS (CONSULTA Y ASIGNACIÓN DE GRUPOS)
  // ==========================================

  async getUsers(
    params?: QueryKeycloakUsersParams,
  ): Promise<KeycloakPaginatedUsers> {
    const response = await api.get<KeycloakPaginatedUsers>(
      KEYCLOAK_ADMIN_ENDPOINTS.USERS,
      { params },
    );
    return response.data;
  },

  async getUserById(id: string): Promise<KeycloakAdminUser> {
    const response = await api.get<KeycloakAdminUser>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_BY_ID(id),
    );
    return response.data;
  },

  async getUserRoles(id: string): Promise<KeycloakUserRolesResponse> {
    const response = await api.get<KeycloakUserRolesResponse>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_ROLES(id),
    );
    return response.data;
  },

  async getUserGroups(id: string): Promise<KeycloakGroupRepresentation[]> {
    const response = await api.get<KeycloakGroupRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_GROUPS(id),
    );
    return response.data;
  },

  async assignUserToGroup(userId: string, groupId: string): Promise<void> {
    await api.put<void>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_GROUP_MEMBERSHIP(userId, groupId),
    );
  },

  async removeUserFromGroup(userId: string, groupId: string): Promise<void> {
    await api.delete<void>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_GROUP_MEMBERSHIP(userId, groupId),
    );
  },

  // ==========================================
  // ROLES (CANDIDATE GROUPS BPMN)
  // ==========================================

  async getCandidateRoles(
    params?: QueryKeycloakRolesParams,
  ): Promise<KeycloakCandidateRole[]> {
    const response = await api.get<KeycloakCandidateRole[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.ROLES_CANDIDATES,
      { params },
    );
    return response.data;
  },

  async getRealmRoles(
    params?: QueryKeycloakRolesParams,
  ): Promise<KeycloakRoleRepresentation[]> {
    const response = await api.get<KeycloakRoleRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.ROLES_REALM,
      { params },
    );
    return response.data;
  },

  async getClientRoles(
    params?: QueryKeycloakRolesParams,
  ): Promise<KeycloakRoleRepresentation[]> {
    const response = await api.get<KeycloakRoleRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.ROLES_CLIENT,
      { params },
    );
    return response.data;
  },

  async getUsersByRole(
    roleName: string,
    params?: { first?: number; max?: number },
  ): Promise<KeycloakAdminUser[]> {
    const response = await api.get<KeycloakAdminUser[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.USERS_BY_ROLE(roleName),
      { params },
    );
    return response.data;
  },

  // ==========================================
  // GRUPOS (CREAR, EDITAR, ELIMINAR Y MIEMBROS)
  // ==========================================

  async getGroups(
    params?: QueryKeycloakGroupsParams,
  ): Promise<KeycloakGroupRepresentation[]> {
    const response = await api.get<KeycloakGroupRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.GROUPS,
      { params },
    );
    return response.data;
  },

  async createGroup(
    payload: CreateKeycloakGroupPayload,
  ): Promise<KeycloakGroupRepresentation> {
    const response = await api.post<KeycloakGroupRepresentation>(
      KEYCLOAK_ADMIN_ENDPOINTS.GROUPS,
      payload,
    );
    return response.data;
  },

  async getGroupById(id: string): Promise<KeycloakGroupRepresentation> {
    const response = await api.get<KeycloakGroupRepresentation>(
      KEYCLOAK_ADMIN_ENDPOINTS.GROUP_BY_ID(id),
    );
    return response.data;
  },

  async updateGroup(
    id: string,
    payload: UpdateKeycloakGroupPayload,
  ): Promise<KeycloakGroupRepresentation> {
    const response = await api.put<KeycloakGroupRepresentation>(
      KEYCLOAK_ADMIN_ENDPOINTS.GROUP_BY_ID(id),
      payload,
    );
    return response.data;
  },

  async deleteGroup(id: string): Promise<void> {
    await api.delete<void>(KEYCLOAK_ADMIN_ENDPOINTS.GROUP_BY_ID(id));
  },

  async getGroupMembers(
    id: string,
    params?: { first?: number; max?: number },
  ): Promise<KeycloakAdminUser[]> {
    const response = await api.get<KeycloakAdminUser[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.GROUP_MEMBERS(id),
      { params },
    );
    return response.data;
  },
};

import { api } from "../../../services/api";
import { KEYCLOAK_ADMIN_ENDPOINTS } from "../constants/keycloak-admin.endpoints";
import type {
  KeycloakAdminUser,
  KeycloakCandidateRole,
  KeycloakGroupRepresentation,
  KeycloakPaginatedUsers,
  KeycloakRoleRepresentation,
  KeycloakUserRolesResponse,
  QueryKeycloakGroupsParams,
  QueryKeycloakRolesParams,
  QueryKeycloakUsersParams,
} from "../types/keycloak-admin.types";

export const keycloakAdminService = {
  // ==========================================
  // USUARIOS
  // ==========================================

  /**
   * Lista y busca usuarios de Keycloak con paginación.
   * Endpoint: GET /api/keycloak-admin/users
   */
  async getUsers(
    params?: QueryKeycloakUsersParams,
  ): Promise<KeycloakPaginatedUsers> {
    const response = await api.get<KeycloakPaginatedUsers>(
      KEYCLOAK_ADMIN_ENDPOINTS.USERS,
      { params },
    );
    return response.data;
  },

  /**
   * Obtiene el detalle de un usuario por su UUID.
   * Endpoint: GET /api/keycloak-admin/users/:id
   */
  async getUserById(id: string): Promise<KeycloakAdminUser> {
    const response = await api.get<KeycloakAdminUser>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_BY_ID(id),
    );
    return response.data;
  },

  /**
   * Consulta los roles de realm, cliente y efectivos asignados a un usuario.
   * Endpoint: GET /api/keycloak-admin/users/:id/roles
   */
  async getUserRoles(id: string): Promise<KeycloakUserRolesResponse> {
    const response = await api.get<KeycloakUserRolesResponse>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_ROLES(id),
    );
    return response.data;
  },

  /**
   * Consulta los grupos a los que pertenece un usuario.
   * Endpoint: GET /api/keycloak-admin/users/:id/groups
   */
  async getUserGroups(id: string): Promise<KeycloakGroupRepresentation[]> {
    const response = await api.get<KeycloakGroupRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.USER_GROUPS(id),
    );
    return response.data;
  },

  // ==========================================
  // ROLES (CANDIDATE GROUPS BPMN)
  // ==========================================

  /**
   * Lista los roles candidatos combinados (cliente + realm) para tareas BPMN.
   * Endpoint: GET /api/keycloak-admin/roles
   */
  async getCandidateRoles(
    params?: QueryKeycloakRolesParams,
  ): Promise<KeycloakCandidateRole[]> {
    const response = await api.get<KeycloakCandidateRole[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.ROLES_CANDIDATES,
      { params },
    );
    return response.data;
  },

  /**
   * Lista los roles del realm en Keycloak.
   * Endpoint: GET /api/keycloak-admin/roles/realm
   */
  async getRealmRoles(
    params?: QueryKeycloakRolesParams,
  ): Promise<KeycloakRoleRepresentation[]> {
    const response = await api.get<KeycloakRoleRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.ROLES_REALM,
      { params },
    );
    return response.data;
  },

  /**
   * Lista los roles del cliente configurado en Keycloak.
   * Endpoint: GET /api/keycloak-admin/roles/client
   */
  async getClientRoles(
    params?: QueryKeycloakRolesParams,
  ): Promise<KeycloakRoleRepresentation[]> {
    const response = await api.get<KeycloakRoleRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.ROLES_CLIENT,
      { params },
    );
    return response.data;
  },

  /**
   * Lista los usuarios que poseen un rol específico.
   * Endpoint: GET /api/keycloak-admin/roles/:roleName/users
   */
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
  // GRUPOS
  // ==========================================

  /**
   * Lista y busca grupos de Keycloak.
   * Endpoint: GET /api/keycloak-admin/groups
   */
  async getGroups(
    params?: QueryKeycloakGroupsParams,
  ): Promise<KeycloakGroupRepresentation[]> {
    const response = await api.get<KeycloakGroupRepresentation[]>(
      KEYCLOAK_ADMIN_ENDPOINTS.GROUPS,
      { params },
    );
    return response.data;
  },

  /**
   * Obtiene el detalle de un grupo por su UUID.
   * Endpoint: GET /api/keycloak-admin/groups/:id
   */
  async getGroupById(id: string): Promise<KeycloakGroupRepresentation> {
    const response = await api.get<KeycloakGroupRepresentation>(
      KEYCLOAK_ADMIN_ENDPOINTS.GROUP_BY_ID(id),
    );
    return response.data;
  },

  /**
   * Lista los usuarios miembros de un grupo de Keycloak.
   * Endpoint: GET /api/keycloak-admin/groups/:id/members
   */
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


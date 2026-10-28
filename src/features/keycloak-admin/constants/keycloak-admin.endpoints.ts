export const KEYCLOAK_ADMIN_ENDPOINTS = {
  /** Listar y buscar usuarios */
  USERS: "/keycloak-admin/users",
  /** Detalle de un usuario por ID */
  USER_BY_ID: (id: string) =>
    `/keycloak-admin/users/${encodeURIComponent(id)}`,
  /** Roles asignados a un usuario */
  USER_ROLES: (id: string) =>
    `/keycloak-admin/users/${encodeURIComponent(id)}/roles`,
  /** Grupos a los que pertenece un usuario */
  USER_GROUPS: (id: string) =>
    `/keycloak-admin/users/${encodeURIComponent(id)}/groups`,

  /** Roles candidatos combinados (cliente + realm) para BPMN */
  ROLES_CANDIDATES: "/keycloak-admin/roles",
  /** Roles del realm */
  ROLES_REALM: "/keycloak-admin/roles/realm",
  /** Roles del cliente */
  ROLES_CLIENT: "/keycloak-admin/roles/client",
  /** Usuarios que poseen un rol específico */
  USERS_BY_ROLE: (roleName: string) =>
    `/keycloak-admin/roles/${encodeURIComponent(roleName)}/users`,

  /** Listar grupos de Keycloak */
  GROUPS: "/keycloak-admin/groups",
  /** Detalle de un grupo por ID */
  GROUP_BY_ID: (id: string) =>
    `/keycloak-admin/groups/${encodeURIComponent(id)}`,
  /** Usuarios miembros de un grupo */
  GROUP_MEMBERS: (id: string) =>
    `/keycloak-admin/groups/${encodeURIComponent(id)}/members`,
} as const;

export const KEYCLOAK_ADMIN_QUERY_KEYS = {
  all: ["keycloak-admin"] as const,

  users: (params?: Record<string, unknown>) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "users", params ?? {}] as const,
  userDetail: (id: string) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "user-detail", id] as const,
  userRoles: (id: string) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "user-roles", id] as const,
  userGroups: (id: string) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "user-groups", id] as const,

  candidateRoles: (params?: Record<string, unknown>) =>
    [
      ...KEYCLOAK_ADMIN_QUERY_KEYS.all,
      "roles-candidates",
      params ?? {},
    ] as const,
  realmRoles: (params?: Record<string, unknown>) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "roles-realm", params ?? {}] as const,
  clientRoles: (params?: Record<string, unknown>) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "roles-client", params ?? {}] as const,
  usersByRole: (roleName: string, params?: Record<string, unknown>) =>
    [
      ...KEYCLOAK_ADMIN_QUERY_KEYS.all,
      "role-users",
      roleName,
      params ?? {},
    ] as const,

  groups: (params?: Record<string, unknown>) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "groups", params ?? {}] as const,
  groupDetail: (id: string) =>
    [...KEYCLOAK_ADMIN_QUERY_KEYS.all, "group-detail", id] as const,
  groupMembers: (id: string, params?: Record<string, unknown>) =>
    [
      ...KEYCLOAK_ADMIN_QUERY_KEYS.all,
      "group-members",
      id,
      params ?? {},
    ] as const,
} as const;


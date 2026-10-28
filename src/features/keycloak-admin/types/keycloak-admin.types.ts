export interface KeycloakAdminUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  enabled: boolean;
  emailVerified: boolean;
}

export interface KeycloakPaginatedUsers {
  data: KeycloakAdminUser[];
  total: number;
  first: number;
  max: number;
}

export interface CreateKeycloakGroupPayload {
  name: string;
  parentId?: string;
}

export interface UpdateKeycloakGroupPayload {
  name: string;
}

export interface KeycloakRoleRepresentation {
  id: string;
  name: string;
  description?: string;
  composite?: boolean;
  clientRole?: boolean;
  containerId?: string;
}

export interface KeycloakCandidateRole {
  id: string;
  name: string;
  description?: string;
  source: "client" | "realm";
  clientId?: string;
}

export interface KeycloakUserRolesResponse {
  realmRoles: KeycloakRoleRepresentation[];
  clientRoles: KeycloakRoleRepresentation[];
  effectiveRoles: string[];
}

export interface KeycloakGroupRepresentation {
  id: string;
  name: string;
  path: string;
  subGroupCount?: number;
  subGroups?: KeycloakGroupRepresentation[];
  attributes?: Record<string, string[]>;
}

export interface QueryKeycloakUsersParams {
  search?: string;
  username?: string;
  email?: string;
  enabled?: boolean;
  first?: number;
  max?: number;
}

export interface QueryKeycloakRolesParams {
  search?: string;
  first?: number;
  max?: number;
}

export interface QueryKeycloakGroupsParams {
  search?: string;
  first?: number;
  max?: number;
}

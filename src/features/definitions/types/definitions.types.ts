export interface ProcessDefinition {
  id: string;
  url: string;
  key: string;
  name: string;
  description: string | null;
  version: number;
  category: string | null;
  deploymentId: string;
  resource: string;
  diagramResource: string | null;
  suspended: boolean;
  tenantId: string;
}

export interface FlowablePage<T> {
  data: T[];
  total: number;
  start: number;
  sort: string | null;
  order: string | null;
  size: number;
}

export interface QueryDefinitionsParams {
  start?: number;
  size?: number;
  name?: string;
  key?: string;
}

export interface DeployProcessPayload {
  name: string;
  xml: string;
  tenantId?: string;
}

export interface FlowableDefinitionSummary {
  id: string;
  key: string;
  name: string;
  version: number;
  deploymentId: string;
  suspended: boolean;
}

export interface DeployProcessResponse {
  deploymentId: string;
  deploymentTime?: string;
  definitions: FlowableDefinitionSummary[];
}

export interface ProcessVersionsResponse {
  key: string;
  totalVersions: number;
  definitions: FlowableDefinitionSummary[];
}

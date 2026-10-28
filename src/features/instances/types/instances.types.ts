export interface ProcessInstance {
  id: string;
  url: string;
  businessKey: string | null;
  suspended: boolean;
  ended: boolean;
  processDefinitionId: string;
  processDefinitionUrl: string;
  activityId: string | null;
  tenantId: string;
}

export interface FlowablePage<T> {
  data: T[];
  total: number;
  start: number;
  size: number;
  sort: string | null;
  order: string | null;
}

export interface QueryInstancesParams {
  start?: number;
  size?: number;
  processDefinitionKey?: string;
  businessKey?: string;
}

export interface StartProcessPayload {
  processDefinitionKey: string;
  businessKey?: string;
  variables?: Record<string, unknown>;
}

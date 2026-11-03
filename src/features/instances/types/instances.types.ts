import type { DynamicJsonSchema } from "../../tasks/types/tasks.types";

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
  startUserId?: string | null;
  startTime?: string | null;
  registradoPor?: string | null;
}

export interface HistoricTaskItem {
  id: string;
  name: string;
  taskDefinitionKey: string | null;
  processInstanceId: string;
  assignee: string | null;
  startTime: string;
  endTime: string | null;
  durationInMillis: number | null;
  deleteReason?: string | null;
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
  startedBy?: string;
}

export interface StartProcessPayload {
  processDefinitionKey: string;
  businessKey?: string;
  variables?: Record<string, unknown>;
}

export interface WorkflowProcessMetadata {
  id: string;
  key: string;
  name: string;
  description: string | null;
  processDefinitionKey: string;
  codePrefix?: string;
  correlativeFormat?: string;
  startFormSchema: DynamicJsonSchema;
  active: boolean;
}

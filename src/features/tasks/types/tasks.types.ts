export interface WorkflowTask {
  id: string;
  name: string;
  description: string | null;
  assignee: string | null;
  owner: string | null;
  priority: number;
  createTime: string;
  dueDate: string | null;
  suspended: boolean;
  taskDefinitionKey: string | null;
  processInstanceId: string | null;
  processDefinitionId: string | null;
  tenantId: string | null;
}

export interface FlowablePage<T> {
  data: T[];
  total: number;
  start: number;
  size: number;
  sort: string | null;
  order: string | null;
}

export interface QueryTasksParams {
  start?: number;
  size?: number;
  name?: string;
  processInstanceId?: string;
  candidateGroup?: string;
}

export interface CompleteTaskPayload {
  variables?: Record<string, unknown>;
}

export interface FormPropertySchema {
  type: string;
  title?: string;
  description?: string;
  enum?: (string | number)[];
  enumNames?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  default?: unknown;
  format?: string;
}

export interface DynamicJsonSchema {
  type: string;
  required?: string[];
  properties?: Record<string, FormPropertySchema>;
}

export interface WorkflowFormDto {
  id: string;
  title: string;
  description?: string | null;
  processDefinitionKey?: string | null;
  processDefinitionId?: string | null;
  taskDefinitionKey: string;
  schema: DynamicJsonSchema;
  active: boolean;
}

export const TASKS_ENDPOINTS = {
  /** Listado de todas las tareas (genérico) */
  BASE: "/workflow/tasks",
  /** Mis tareas asignadas */
  MINE: "/workflow/tasks/mine",
  /** Tareas disponibles para reclamar según roles/candidatura */
  AVAILABLE: "/workflow/tasks/available",
  /** Detalle de una tarea específica */
  BY_ID: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}`,
  /** Variables y documentos antecedentes de una tarea */
  VARIABLES: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}/variables`,
  /** Reclamar tarea */
  CLAIM: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}/claim`,
  /** Liberar tarea propia */
  UNCLAIM: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}/unclaim`,
  /** Completar tarea */
  COMPLETE: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}/complete`,
  /** Formulario dinámico asignado a la tarea en tiempo de ejecución */
  FORM: (taskId: string) => `/workflow/forms/task/${encodeURIComponent(taskId)}`,
  /** Formularios configurados para un proceso */
  FORMS_BY_PROCESS: (processKey: string) =>
    `/workflow/forms/process/${encodeURIComponent(processKey)}`,
  /** Formulario de una etapa específica por proceso y tarea */
  FORM_BY_PROCESS_TASK: (processKey: string, taskKey: string) =>
    `/workflow/forms/process/${encodeURIComponent(processKey)}/task/${encodeURIComponent(taskKey)}`,
} as const;

export const TASKS_QUERY_KEYS = {
  all: ["workflow-tasks"] as const,
  mine: (params?: Record<string, unknown>) =>
    [...TASKS_QUERY_KEYS.all, "mine", params ?? {}] as const,
  available: (params?: Record<string, unknown>) =>
    [...TASKS_QUERY_KEYS.all, "available", params ?? {}] as const,
  detail: (id: string) =>
    [...TASKS_QUERY_KEYS.all, "detail", id] as const,
  variables: (id: string) =>
    [...TASKS_QUERY_KEYS.all, "variables", id] as const,
  form: (taskId: string) =>
    [...TASKS_QUERY_KEYS.all, "form", taskId] as const,
  formsByProcess: (processKey: string) =>
    [...TASKS_QUERY_KEYS.all, "forms-by-process", processKey] as const,
  formByProcessTask: (processKey: string, taskKey: string) =>
    [...TASKS_QUERY_KEYS.all, "form-by-process-task", processKey, taskKey] as const,
} as const;

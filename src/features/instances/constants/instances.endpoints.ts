export const INSTANCES_ENDPOINTS = {
  /** Listar instancias activas con paginación y filtros */
  BASE: "/workflow/instances",
  /** Consultar detalle de una instancia por ID */
  BY_ID: (id: string) => `/workflow/instances/${encodeURIComponent(id)}`,
  /** Cancelar / eliminar una instancia en ejecución */
  CANCEL: (id: string) => `/workflow/instances/${encodeURIComponent(id)}`,
  /** Diagrama BPMN visual con estado actual */
  DIAGRAM: (id: string) => `/workflow/instances/${encodeURIComponent(id)}/diagram`,
  /** Variables de la instancia */
  VARIABLES: (id: string) => `/workflow/instances/${encodeURIComponent(id)}/variables`,
  /** Historial de tareas de la instancia */
  HISTORY_TASKS: (instanceId: string) =>
    `/workflow/history/tasks?processInstanceId=${encodeURIComponent(instanceId)}&size=100`,
  /** Consultar procesos configurados con sus esquemas de inicio */
  AVAILABLE_PROCESSES: "/workflow/processes/available",
} as const;

export const INSTANCES_QUERY_KEYS = {
  all: ["workflow-instances"] as const,
  list: (params?: Record<string, unknown>) =>
    [...INSTANCES_QUERY_KEYS.all, "list", params ?? {}] as const,
  detail: (id: string) =>
    [...INSTANCES_QUERY_KEYS.all, "detail", id] as const,
  diagram: (id: string) =>
    [...INSTANCES_QUERY_KEYS.all, "diagram", id] as const,
  variables: (id: string) =>
    [...INSTANCES_QUERY_KEYS.all, "variables", id] as const,
  historyTasks: (id: string) =>
    [...INSTANCES_QUERY_KEYS.all, "history-tasks", id] as const,
  availableProcesses: () =>
    [...INSTANCES_QUERY_KEYS.all, "available-processes"] as const,
} as const;

export const INSTANCES_ENDPOINTS = {
  /** Listar instancias activas con paginación y filtros */
  BASE: "/workflow/instances",
  /** Consultar detalle de una instancia por ID */
  BY_ID: (id: string) => `/workflow/instances/${encodeURIComponent(id)}`,
  /** Cancelar / eliminar una instancia en ejecución */
  CANCEL: (id: string) => `/workflow/instances/${encodeURIComponent(id)}`,
} as const;

export const INSTANCES_QUERY_KEYS = {
  all: ["workflow-instances"] as const,
  list: (params?: Record<string, unknown>) =>
    [...INSTANCES_QUERY_KEYS.all, "list", params ?? {}] as const,
  detail: (id: string) =>
    [...INSTANCES_QUERY_KEYS.all, "detail", id] as const,
} as const;

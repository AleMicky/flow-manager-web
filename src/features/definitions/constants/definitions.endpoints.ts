export const DEFINITIONS_ENDPOINTS = {
  /** Listar procesos BPMN con paginación y filtros opcionales */
  BASE: "/workflow/definitions",
  /** Buscar la última versión de una definición por su clave (key) */
  BY_KEY: (key: string) => `/workflow/definitions/key/${encodeURIComponent(key)}`,
  /** Consultar todas las versiones publicadas de un proceso */
  VERSIONS: (key: string) =>
    `/workflow/definitions/key/${encodeURIComponent(key)}/versions`,
  /** Consultar detalle de una definición por su ID único */
  BY_ID: (id: string) => `/workflow/definitions/${encodeURIComponent(id)}`,
  /** Recuperar el contenido XML BPMN 2.0 de una definición */
  XML: (id: string) => `/workflow/definitions/${encodeURIComponent(id)}/xml`,
  /** Publicar (deploy) un nuevo archivo o especificación XML BPMN */
  DEPLOY: "/workflow/definitions/deploy",
} as const;

export const DEFINITIONS_QUERY_KEYS = {
  all: ["workflow-definitions"] as const,
  list: (params?: Record<string, unknown>) =>
    [...DEFINITIONS_QUERY_KEYS.all, "list", params ?? {}] as const,
  detail: (id: string) =>
    [...DEFINITIONS_QUERY_KEYS.all, "detail", id] as const,
  byKey: (key: string) =>
    [...DEFINITIONS_QUERY_KEYS.all, "key", key] as const,
  versions: (key: string) =>
    [...DEFINITIONS_QUERY_KEYS.all, "versions", key] as const,
  xml: (id: string) =>
    [...DEFINITIONS_QUERY_KEYS.all, "xml", id] as const,
} as const;

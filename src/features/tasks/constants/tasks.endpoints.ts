export const TASKS_ENDPOINTS = {
  /** Listado de todas las tareas (genérico) */
  BASE: "/workflow/tasks",
  /** Mis tareas asignadas */
  MINE: "/workflow/tasks/mine",
  /** Tareas disponibles para reclamar según roles/candidatura */
  AVAILABLE: "/workflow/tasks/available",
  /** Detalle de una tarea específica */
  BY_ID: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}`,
  /** Reclamar tarea */
  CLAIM: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}/claim`,
  /** Liberar tarea propia */
  UNCLAIM: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}/unclaim`,
  /** Completar tarea */
  COMPLETE: (id: string) => `/workflow/tasks/${encodeURIComponent(id)}/complete`,
} as const;

export const TASKS_QUERY_KEYS = {
  all: ["workflow-tasks"] as const,
  mine: (params?: Record<string, unknown>) =>
    [...TASKS_QUERY_KEYS.all, "mine", params ?? {}] as const,
  available: (params?: Record<string, unknown>) =>
    [...TASKS_QUERY_KEYS.all, "available", params ?? {}] as const,
  detail: (id: string) =>
    [...TASKS_QUERY_KEYS.all, "detail", id] as const,
} as const;

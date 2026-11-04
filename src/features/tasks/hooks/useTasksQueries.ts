import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TASKS_QUERY_KEYS } from "../constants/tasks.endpoints";
import { tasksService } from "../services/tasks.service";
import type {
  CompleteTaskPayload,
  QueryTasksParams,
} from "../types/tasks.types";

/**
 * Hook para consultar todas las tareas del sistema (modo supervisión admin).
 */
export function useAllTasksQuery(params?: QueryTasksParams, enabled = true) {
  return useQuery({
    queryKey: [...TASKS_QUERY_KEYS.all, "global", params ?? {}] as const,
    queryFn: () => tasksService.getAll(params),
    enabled,
    staleTime: 15_000,
  });
}

/**
 * Hook para consultar mis tareas asignadas (/workflow/tasks/mine).
 */
export function useMyTasksQuery(params?: QueryTasksParams) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.mine(params as Record<string, unknown>),
    queryFn: () => tasksService.getMine(params),
    staleTime: 15_000,
  });
}

/**
 * Hook para consultar tareas disponibles para reclamar (/workflow/tasks/available).
 */
export function useAvailableTasksQuery(params?: QueryTasksParams) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.available(params as Record<string, unknown>),
    queryFn: () => tasksService.getAvailable(params),
    staleTime: 15_000,
  });
}

/**
 * Hook para consultar el detalle de una tarea por ID.
 */
export function useTaskDetailQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => tasksService.getById(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
  });
}

/**
 * Hook para consultar las variables y documentos antecedentes de una tarea.
 */
export function useTaskVariablesQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.variables(id ?? ""),
    queryFn: () => tasksService.getVariables(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
  });
}

/**
 * Hook para consultar el formulario dinámico asignado a una tarea.
 */
export function useTaskFormQuery(taskId?: string, enabled = true) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.form(taskId ?? ""),
    queryFn: () => tasksService.getForm(taskId!),
    enabled: Boolean(taskId) && enabled,
    staleTime: 60_000,
  });
}

/**
 * Mutación para reclamar una tarea.
 */
export function useClaimTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksService.claim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.all,
      });
    },
  });
}

/**
 * Mutación para liberar una tarea propia.
 */
export function useUnclaimTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tasksService.unclaim(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.all,
      });
    },
  });
}

/**
 * Mutación para completar una tarea.
 */
export function useCompleteTaskMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: CompleteTaskPayload;
    }) => tasksService.complete(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.all,
      });
    },
  });
}

/**
 * Consulta todos los formularios configurados para un proceso BPMN.
 */
export function useProcessFormsQuery(processKey?: string, enabled = true) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.formsByProcess(processKey ?? ""),
    queryFn: () => tasksService.getFormsByProcess(processKey!),
    enabled: Boolean(processKey) && enabled,
    staleTime: 30_000,
  });
}

/**
 * Consulta el formulario de una etapa específica por proceso y taskKey.
 */
export function useTaskFormByProcessTaskQuery(
  processKey?: string,
  taskKey?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: TASKS_QUERY_KEYS.formByProcessTask(
      processKey ?? "",
      taskKey ?? "",
    ),
    queryFn: () => tasksService.getFormByProcessAndTask(processKey!, taskKey!),
    enabled: Boolean(processKey && taskKey) && enabled,
    staleTime: 30_000,
  });
}

/**
 * Mutación para guardar o actualizar el formulario dinámico de una etapa BPMN.
 */
export function useSaveTaskFormMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      processKey,
      taskKey,
      payload,
    }: {
      processKey: string;
      taskKey: string;
      payload: {
        title: string;
        description?: string | null;
        schema: Record<string, unknown>;
        active?: boolean;
      };
    }) => tasksService.saveTaskForm(processKey, taskKey, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.formsByProcess(variables.processKey),
      });
      queryClient.invalidateQueries({
        queryKey: TASKS_QUERY_KEYS.formByProcessTask(
          variables.processKey,
          variables.taskKey,
        ),
      });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TASKS_QUERY_KEYS } from "../constants/tasks.endpoints";
import { tasksService } from "../services/tasks.service";
import type {
  CompleteTaskPayload,
  QueryTasksParams,
} from "../types/tasks.types";

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

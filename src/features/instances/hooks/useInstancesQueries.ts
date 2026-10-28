import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { INSTANCES_QUERY_KEYS } from "../constants/instances.endpoints";
import { instancesService } from "../services/instances.service";
import type {
  QueryInstancesParams,
  StartProcessPayload,
} from "../types/instances.types";

/**
 * Hook para consultar el listado paginado y filtrado de instancias activas.
 */
export function useInstancesQuery(params?: QueryInstancesParams) {
  return useQuery({
    queryKey: INSTANCES_QUERY_KEYS.list(params as Record<string, unknown>),
    queryFn: () => instancesService.getInstances(params),
    staleTime: 15_000,
  });
}

/**
 * Hook para consultar el detalle de una instancia específica por ID.
 */
export function useInstanceDetailQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: INSTANCES_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => instancesService.getById(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 30_000,
  });
}

/**
 * Mutación para iniciar un nuevo proceso BPMN.
 */
export function useStartProcessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartProcessPayload) =>
      instancesService.start(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INSTANCES_QUERY_KEYS.all,
      });
    },
  });
}

/**
 * Mutación para cancelar / terminar una instancia activa.
 */
export function useCancelInstanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => instancesService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: INSTANCES_QUERY_KEYS.all,
      });
    },
  });
}

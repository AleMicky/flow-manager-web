import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFINITIONS_QUERY_KEYS } from "../constants/definitions.endpoints";
import { definitionsService } from "../services/definitions.service";
import type {
  DeployProcessPayload,
  QueryDefinitionsParams,
} from "../types/definitions.types";

/**
 * Hook para consultar el catálogo paginado y filtrado de definiciones BPMN.
 */
export function useDefinitionsQuery(params?: QueryDefinitionsParams) {
  return useQuery({
    queryKey: DEFINITIONS_QUERY_KEYS.list(params as Record<string, unknown>),
    queryFn: () => definitionsService.getDefinitions(params),
    staleTime: 30_000,
  });
}

/**
 * Hook para consultar el detalle de una definición por ID.
 */
export function useDefinitionDetailQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: DEFINITIONS_QUERY_KEYS.detail(id ?? ""),
    queryFn: () => definitionsService.getById(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  });
}

/**
 * Hook para consultar las versiones publicadas de un proceso por su clave.
 */
export function useDefinitionVersionsQuery(key?: string, enabled = true) {
  return useQuery({
    queryKey: DEFINITIONS_QUERY_KEYS.versions(key ?? ""),
    queryFn: () => definitionsService.getVersions(key!),
    enabled: Boolean(key) && enabled,
    staleTime: 30_000,
  });
}

/**
 * Hook para descargar y visualizar el XML de una definición BPMN.
 */
export function useDefinitionXmlQuery(id?: string, enabled = true) {
  return useQuery({
    queryKey: DEFINITIONS_QUERY_KEYS.xml(id ?? ""),
    queryFn: () => definitionsService.getXml(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  });
}

/**
 * Mutación para publicar un nuevo diagrama BPMN en Flowable.
 */
export function useDeployProcessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DeployProcessPayload) =>
      definitionsService.deploy(payload),
    onSuccess: () => {
      // Invalida la lista de definiciones para reflejar el nuevo despliegue
      queryClient.invalidateQueries({
        queryKey: DEFINITIONS_QUERY_KEYS.all,
      });
    },
  });
}

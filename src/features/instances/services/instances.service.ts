import { api } from "../../../services/api";
import { INSTANCES_ENDPOINTS } from "../constants/instances.endpoints";
import type {
  FlowablePage,
  ProcessInstance,
  QueryInstancesParams,
  StartProcessPayload,
} from "../types/instances.types";

export const instancesService = {
  /**
   * Consulta las instancias de proceso activas con paginación y filtros.
   * Endpoint: GET /api/workflow/instances
   */
  async getInstances(
    params?: QueryInstancesParams,
  ): Promise<FlowablePage<ProcessInstance>> {
    const response = await api.get<FlowablePage<ProcessInstance>>(
      INSTANCES_ENDPOINTS.BASE,
      { params },
    );
    return response.data;
  },

  /**
   * Consulta el detalle de una instancia por su ID único.
   * Endpoint: GET /api/workflow/instances/:id
   */
  async getById(id: string): Promise<ProcessInstance> {
    const response = await api.get<ProcessInstance>(
      INSTANCES_ENDPOINTS.BY_ID(id),
    );
    return response.data;
  },

  /**
   * Inicia una nueva ejecución de proceso BPMN.
   * Endpoint: POST /api/workflow/instances
   */
  async start(payload: StartProcessPayload): Promise<ProcessInstance> {
    const response = await api.post<ProcessInstance>(
      INSTANCES_ENDPOINTS.BASE,
      payload,
    );
    return response.data;
  },

  /**
   * Cancela y elimina una instancia en ejecución.
   * Endpoint: DELETE /api/workflow/instances/:id
   */
  async cancel(id: string): Promise<void> {
    await api.delete(INSTANCES_ENDPOINTS.CANCEL(id));
  },
};

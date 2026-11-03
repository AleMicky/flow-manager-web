import { api } from "../../../services/api";
import { INSTANCES_ENDPOINTS } from "../constants/instances.endpoints";
import type {
  FlowablePage,
  HistoricTaskItem,
  ProcessInstance,
  QueryInstancesParams,
  StartProcessPayload,
  WorkflowProcessMetadata,
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
   * Obtiene la imagen del diagrama BPMN con el avance actual resaltado.
   * Endpoint: GET /api/workflow/instances/:id/diagram
   */
  async getInstanceDiagram(id: string): Promise<string> {
    const response = await api.get<Blob>(INSTANCES_ENDPOINTS.DIAGRAM(id), {
      responseType: "blob",
    });
    return URL.createObjectURL(response.data);
  },

  /**
   * Obtiene las variables acumuladas de la instancia.
   * Endpoint: GET /api/workflow/instances/:id/variables
   */
  async getInstanceVariables(id: string): Promise<Record<string, unknown>> {
    const response = await api.get<Record<string, unknown>>(
      INSTANCES_ENDPOINTS.VARIABLES(id),
    );
    return response.data;
  },

  /**
   * Consulta el historial de tareas ejecutadas para la instancia.
   * Endpoint: GET /api/workflow/history/tasks?processInstanceId=...
   */
  async getInstanceHistoricTasks(id: string): Promise<HistoricTaskItem[]> {
    const response = await api.get<{ data: HistoricTaskItem[] }>(
      INSTANCES_ENDPOINTS.HISTORY_TASKS(id),
    );
    return response.data?.data || [];
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

  /**
   * Consulta los procesos habilitados con sus esquemas de formulario de inicio.
   * Endpoint: GET /api/workflow/processes/available
   */
  async getAvailableProcesses(): Promise<WorkflowProcessMetadata[]> {
    const response = await api.get<WorkflowProcessMetadata[]>(
      INSTANCES_ENDPOINTS.AVAILABLE_PROCESSES,
    );
    return response.data;
  },
};

import { api } from "../../../services/api";
import { TASKS_ENDPOINTS } from "../constants/tasks.endpoints";
import type {
  CompleteTaskPayload,
  FlowablePage,
  QueryTasksParams,
  WorkflowTask,
} from "../types/tasks.types";

export const tasksService = {
  /**
   * Obtiene la lista de tareas asignadas al usuario autenticado.
   * Endpoint: GET /api/workflow/tasks/mine
   */
  async getMine(
    params?: QueryTasksParams,
  ): Promise<FlowablePage<WorkflowTask>> {
    const response = await api.get<FlowablePage<WorkflowTask>>(
      TASKS_ENDPOINTS.MINE,
      { params },
    );
    return response.data;
  },

  /**
   * Obtiene la lista de tareas disponibles para reclamar según roles/candidatura.
   * Endpoint: GET /api/workflow/tasks/available
   */
  async getAvailable(
    params?: QueryTasksParams,
  ): Promise<FlowablePage<WorkflowTask>> {
    const response = await api.get<FlowablePage<WorkflowTask>>(
      TASKS_ENDPOINTS.AVAILABLE,
      { params },
    );
    return response.data;
  },

  /**
   * Obtiene el detalle de una tarea por su ID.
   * Endpoint: GET /api/workflow/tasks/:id
   */
  async getById(id: string): Promise<WorkflowTask> {
    const response = await api.get<WorkflowTask>(TASKS_ENDPOINTS.BY_ID(id));
    return response.data;
  },

  /**
   * Reclama una tarea para el usuario autenticado.
   * Endpoint: POST /api/workflow/tasks/:id/claim
   */
  async claim(id: string): Promise<WorkflowTask> {
    const response = await api.post<WorkflowTask>(TASKS_ENDPOINTS.CLAIM(id));
    return response.data;
  },

  /**
   * Libera una tarea asignada previamente por el usuario.
   * Endpoint: POST /api/workflow/tasks/:id/unclaim
   */
  async unclaim(id: string): Promise<void> {
    await api.post<void>(TASKS_ENDPOINTS.UNCLAIM(id));
  },

  /**
   * Completa una tarea enviando variables de finalización.
   * Endpoint: POST /api/workflow/tasks/:id/complete
   */
  async complete(
    id: string,
    payload?: CompleteTaskPayload,
  ): Promise<void> {
    await api.post<void>(TASKS_ENDPOINTS.COMPLETE(id), payload ?? {});
  },
};

import { api } from "../../../services/api";
import { TASKS_ENDPOINTS } from "../constants/tasks.endpoints";
import type {
  CompleteTaskPayload,
  FlowablePage,
  QueryTasksParams,
  WorkflowFormDto,
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
   * Obtiene las variables y documentos antecedentes de una tarea.
   * Endpoint: GET /api/workflow/tasks/:id/variables
   */
  async getVariables(id: string): Promise<Record<string, unknown>> {
    try {
      const response = await api.get<Record<string, unknown>>(
        TASKS_ENDPOINTS.VARIABLES(id),
      );
      return response.data;
    } catch {
      return {};
    }
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

  /**
   * Obtiene el formulario dinámico asignado a la tarea (si existe).
   * Endpoint: GET /api/workflow/forms/task/:taskId
   */
  async getForm(taskId: string): Promise<WorkflowFormDto | null> {
    try {
      const response = await api.get<WorkflowFormDto>(TASKS_ENDPOINTS.FORM(taskId));
      return response.data;
    } catch {
      return null;
    }
  },
};

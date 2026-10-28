import { api } from "../../../services/api";
import { DEFINITIONS_ENDPOINTS } from "../constants/definitions.endpoints";
import type {
  DeployProcessPayload,
  DeployProcessResponse,
  FlowablePage,
  ProcessDefinition,
  ProcessVersionsResponse,
  QueryDefinitionsParams,
} from "../types/definitions.types";

export const definitionsService = {
  /**
   * Consulta la lista paginada de definiciones de proceso BPMN.
   * Endpoint: GET /api/workflow/definitions
   */
  async getDefinitions(
    params?: QueryDefinitionsParams,
  ): Promise<FlowablePage<ProcessDefinition>> {
    const response = await api.get<FlowablePage<ProcessDefinition>>(
      DEFINITIONS_ENDPOINTS.BASE,
      { params },
    );
    return response.data;
  },

  /**
   * Consulta la última versión activa de una definición por su clave (key).
   * Endpoint: GET /api/workflow/definitions/key/:key
   */
  async getByKey(key: string): Promise<FlowablePage<ProcessDefinition>> {
    const response = await api.get<FlowablePage<ProcessDefinition>>(
      DEFINITIONS_ENDPOINTS.BY_KEY(key),
    );
    return response.data;
  },

  /**
   * Obtiene el detalle de una definición por su ID único.
   * Endpoint: GET /api/workflow/definitions/:id
   */
  async getById(id: string): Promise<ProcessDefinition> {
    const response = await api.get<ProcessDefinition>(
      DEFINITIONS_ENDPOINTS.BY_ID(id),
    );
    return response.data;
  },

  /**
   * Obtiene la lista de todas las versiones publicadas de un proceso por clave.
   * Endpoint: GET /api/workflow/definitions/key/:key/versions
   */
  async getVersions(key: string): Promise<ProcessVersionsResponse> {
    const response = await api.get<ProcessVersionsResponse>(
      DEFINITIONS_ENDPOINTS.VERSIONS(key),
    );
    return response.data;
  },

  /**
   * Recupera el XML BPMN 2.0 en texto plano de una definición.
   * Endpoint: GET /api/workflow/definitions/:id/xml
   */
  async getXml(id: string): Promise<string> {
    const response = await api.get<string>(DEFINITIONS_ENDPOINTS.XML(id), {
      responseType: "text",
    });
    return response.data;
  },

  /**
   * Publica (despliega) una nueva definición BPMN en el motor Flowable.
   * Requiere roles workflow-admin o workflow-designer y token CSRF.
   * Endpoint: POST /api/workflow/definitions/deploy
   */
  async deploy(payload: DeployProcessPayload): Promise<DeployProcessResponse> {
    const response = await api.post<DeployProcessResponse>(
      DEFINITIONS_ENDPOINTS.DEPLOY,
      payload,
    );
    return response.data;
  },
};

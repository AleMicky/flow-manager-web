import type { ProcessDefinition } from "../../definitions/types/definitions.types";
import type { WorkflowProcessMetadata } from "../types/instances.types";

/**
 * Obtiene un nombre comprensible y amigable para el usuario final a partir del
 * processDefinitionId o processDefinitionKey.
 * Evita mostrar identificadores técnicos internos como 'solicitudCompra:2:1240'.
 */
export function getProcessFriendlyName(
  processDefinitionIdOrKey?: string | null,
  definitions?: ProcessDefinition[],
  available?: WorkflowProcessMetadata[],
): string {
  if (!processDefinitionIdOrKey) return "Trámite General";

  // 1. Coincidencia directa por id en definitions
  const defById = definitions?.find((d) => d.id === processDefinitionIdOrKey);
  if (defById?.name) return defById.name;

  // 2. Extraer la key (en formato key:version:id)
  const key = processDefinitionIdOrKey.includes(":")
    ? processDefinitionIdOrKey.split(":")[0]
    : processDefinitionIdOrKey;

  // 3. Buscar en procesos disponibles configurados
  const avail = available?.find(
    (p) => p.processDefinitionKey === key || p.key === key,
  );
  if (avail?.name) return avail.name;

  // 4. Buscar por key en el catálogo de definiciones de Flowable
  const defByKey = definitions?.find((d) => d.key === key);
  if (defByKey?.name) return defByKey.name;

  // 5. Fallback: formatear la clave camelCase / kebab-case a texto legible
  if (key) {
    const formatted = key
      .replace(/([A-Z])/g, " $1")
      .replace(/[-_]/g, " ")
      .trim();
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  return "Trámite General";
}

/**
 * Formatea el nombre de la actividad o paso actual para que no se muestren
 * códigos técnicos crudos como 'sid-B3910A' o 'reviewTask'.
 */
export function formatActivityName(activityId?: string | null): {
  label: string;
  isCompletedOrEmpty: boolean;
} {
  if (!activityId) {
    return { label: "Sin tareas pendientes", isCompletedOrEmpty: true };
  }

  // Si es un identificador autogenerado de nodo BPMN (sid-xxxx)
  if (activityId.toLowerCase().startsWith("sid-")) {
    return { label: "Revisión en curso", isCompletedOrEmpty: false };
  }

  // Quitar sufijos técnicos habituales (Task, Step, Activity, etc.)
  let cleaned = activityId
    .replace(/(UserTask|Task|Step|Activity|Action)$/i, "")
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .trim();

  if (!cleaned) {
    cleaned = "Tarea en curso";
  }

  const label = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return { label, isCompletedOrEmpty: false };
}


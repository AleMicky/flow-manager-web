import type { WorkflowTask } from "../types/tasks.types";

/**
 * Determina si una tarea BPMN es de tipo Aprobación / Visto Bueno / Decisión
 * (vs tarea operativa de gestión, llenado de formulario o tramitación).
 */
export function isApprovalTask(
  task: WorkflowTask | { taskDefinitionKey?: string | null; name?: string | null },
): boolean {
  const key = (task.taskDefinitionKey || "").toLowerCase();
  const name = (task.name || "").toLowerCase();

  // Claves BPMN conocidas de tareas de decisión / VoBo
  const approvalKeys = [
    "verificar",
    "aprobacion",
    "aprobar",
    "vobo",
    "decision",
    "autorizacion",
    "evaluacion",
    "dictamen",
    "conformidad",
  ];

  if (approvalKeys.some((k) => key.includes(k))) {
    return true;
  }

  // Palabras clave en el nombre de la actividad
  const approvalKeywords = [
    "verificación",
    "verificacion",
    "aprobación",
    "aprobacion",
    "aprobar",
    "visto bueno",
    "vobo",
    "decisión",
    "decision",
    "autorización",
    "autorizacion",
    "evaluación",
    "evaluacion",
    "dictamen",
    "conformidad",
  ];

  return approvalKeywords.some((word) => name.includes(word));
}

/**
 * Determina si una tarea es operativa (requiere llenar formulario, asignar personas, cargar pliegos, etc.)
 */
export function isOperationalTask(
  task: WorkflowTask | { taskDefinitionKey?: string | null; name?: string | null },
): boolean {
  return !isApprovalTask(task);
}


import axios from "axios";

/**
 * Extrae un mensaje de error legible a partir de cualquier objeto de error,
 * soportando estructuras de respuesta de Axios, respuestas estándar de NestJS
 * (strings o arrays de mensajes de validación), errores de red y timeouts.
 */
export function getErrorMessage(
  error: unknown,
  fallbackMessage = "Ocurrió un error inesperado",
): string {
  if (!error) return fallbackMessage;

  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[]; error?: string }
      | undefined;

    if (data) {
      if (Array.isArray(data.message) && data.message.length > 0) {
        return data.message.join(", ");
      }
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }
      if (typeof data.error === "string" && data.error.trim()) {
        return data.error;
      }
    }

    if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
      return "El servidor tardó demasiado en responder (Tiempo de espera agotado).";
    }
    if (error.message === "Network Error") {
      return "No se pudo conectar con el servidor. Verifica tu conexión de red.";
    }
    if (error.response?.status === 403) {
      return "No tienes permisos suficientes para realizar esta acción.";
    }
    if (error.response?.status === 401) {
      return "Tu sesión ha expirado o no estás autenticado.";
    }
    if (error.response?.status === 404) {
      return "El recurso solicitado no fue encontrado en el servidor.";
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallbackMessage;
}


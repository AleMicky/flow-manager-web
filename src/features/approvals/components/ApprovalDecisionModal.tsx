import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FormOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useMemo, useState } from "react";
import { useAuthStore } from "../../../stores/auth.store";
import {
  useCompleteTaskMutation,
  useTaskFormQuery,
} from "../../tasks/hooks/useTasksQueries";
import { DynamicFormRenderer } from "../../tasks/components/DynamicFormRenderer";
import type { WorkflowTask } from "../../tasks/types/tasks.types";

const { Text } = Typography;
const { TextArea } = Input;

export type ApprovalActionType = "APPROVE" | "REJECT" | "OBSERVE";

interface ApprovalDecisionModalProps {
  open: boolean;
  task: WorkflowTask | null;
  action: ApprovalActionType;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ApprovalDecisionModal({
  open,
  task,
  action,
  onClose,
  onSuccess,
}: ApprovalDecisionModalProps) {
  const [form] = Form.useForm();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user } = useAuthStore();
  const completeMutation = useCompleteTaskMutation();

  const isApprove = action === "APPROVE";
  const isReject = action === "REJECT";

  // Consultamos el formulario dinámico para sincronizar las banderas del gateway en cualquier decisión
  const { data: formDto, isLoading: isLoadingForm } = useTaskFormQuery(
    task?.id,
    Boolean(open && task?.id),
  );

  const handleModalClose = () => {
    form.resetFields();
    setErrorMessage(null);
    onClose();
  };

  // Esquema de campos específicos del formulario dinámico (solo para APROBACIÓN)
  const dynamicSchema = useMemo(() => {
    // Si no es aprobación (es rechazo u observación), no se muestra ningún campo del formulario operativo
    if (!isApprove) return null;

    if (!formDto?.schema?.properties) return null;
    const props = { ...formDto.schema.properties };

    // Banderas de decisión internas que se asignan directamente por la acción Aprobar / Rechazar
    const internalDecisionKeys = Object.keys(props).filter(
      (k) =>
        k.toLowerCase().startsWith("aprobado") ||
        k.toLowerCase().startsWith("vobo") ||
        k.toLowerCase() === "decisionfinal" ||
        k.toLowerCase() === "decision" ||
        k.toLowerCase() === "estadodecision",
    );
    internalDecisionKeys.forEach((k) => delete props[k]);

    if (Object.keys(props).length === 0) return null;

    const req = (formDto.schema.required || []).filter(
      (k) => !internalDecisionKeys.includes(k),
    );

    return {
      type: "object" as const,
      properties: props,
      required: req,
    };
  }, [formDto, isApprove]);

  const hasSpecificCommentsField = useMemo(() => {
    if (!dynamicSchema?.properties) return false;
    return Object.keys(dynamicSchema.properties).some(
      (k) =>
        k.toLowerCase().includes("obs") ||
        k.toLowerCase().includes("comentario") ||
        k.toLowerCase().includes("justificacion") ||
        k.toLowerCase().includes("informe"),
    );
  }, [dynamicSchema]);

  const modalConfig = {
    APPROVE: {
      title: "Confirmar Aprobación de Solicitud",
      icon: <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 20 }} />,
      okText: "Aprobar y Continuar Flujo",
      okButtonProps: { style: { backgroundColor: "#16a34a", borderColor: "#16a34a" } },
      alertType: "success" as const,
      alertMessage: "Estás a punto de otorgar tu visto bueno conforme a esta solicitud.",
    },
    REJECT: {
      title: "Rechazar Solicitud",
      icon: <CloseCircleOutlined style={{ color: "#dc2626", fontSize: 20 }} />,
      okText: "Confirmar Rechazo",
      okButtonProps: { danger: true },
      alertType: "error" as const,
      alertMessage: "Esta acción rechazará la solicitud y detendrá el avance del trámite.",
    },
    OBSERVE: {
      title: "Devolver con Observaciones",
      icon: <ExclamationCircleOutlined style={{ color: "#d97706", fontSize: 20 }} />,
      okText: "Enviar Observaciones",
      okButtonProps: { style: { backgroundColor: "#d97706", borderColor: "#d97706" } },
      alertType: "warning" as const,
      alertMessage: "La solicitud será devuelta al solicitante para que realice las correcciones indicadas.",
    },
  }[action];

  const handleFinish = async (values: Record<string, unknown>) => {
    if (!task) return;
    setErrorMessage(null);

    const approverName = user?.name || user?.username || "Aprobador";
    const dynamicFlags: Record<string, unknown> = {};

    // Sincronizar dinámicamente cualquier bandera de aprobación declarada en el esquema
    if (formDto?.schema?.properties) {
      for (const key of Object.keys(formDto.schema.properties)) {
        if (key.toLowerCase().startsWith("aprobado") || key.toLowerCase().startsWith("vobo")) {
          dynamicFlags[key] = isApprove;
        }
        if (key === "decisionFinal") {
          dynamicFlags[key] = isApprove
            ? "APROBADO"
            : isReject
              ? "RECHAZADO"
              : "OBSERVADO";
        }
      }
    }

    const commentText =
      typeof values.comentarios === "string" ? values.comentarios.trim() : "";
    const resolvedComment =
      commentText || (isApprove ? "Aprobado conforme" : "Sin comentarios");

    const taskKey = task.taskDefinitionKey || "";
    if (taskKey === "taskVerificarExistencias") {
      dynamicFlags.aprobadoAlmacenes = isApprove;
      if (!values.obsAlmacenes) dynamicFlags.obsAlmacenes = resolvedComment;
    } else if (taskKey === "taskVerificarPresupuesto") {
      dynamicFlags.aprobadoPresupuesto = isApprove;
      if (!values.obsPresupuesto) dynamicFlags.obsPresupuesto = resolvedComment;
    } else if (taskKey === "taskAprobacionSuperior") {
      dynamicFlags.aprobadoSuperior = isApprove;
      if (!values.obsSuperior) dynamicFlags.obsSuperior = resolvedComment;
    } else if (taskKey === "taskGafCat1" || taskKey === "taskGafCat2") {
      dynamicFlags.aprobadoGaf = isApprove;
      if (!values.obsGaf) dynamicFlags.obsGaf = resolvedComment;
    } else if (taskKey === "taskVoboFinanciero") {
      dynamicFlags.voboFinanciero = isApprove;
      dynamicFlags.aprobadoFinanciero = isApprove;
      if (!values.obsFinanciero) dynamicFlags.obsFinanciero = resolvedComment;
    } else if (taskKey === "taskVoboLegal") {
      dynamicFlags.voboLegal = isApprove;
      dynamicFlags.aprobadoLegal = isApprove;
      if (!values.obsLegal) dynamicFlags.obsLegal = resolvedComment;
    } else if (
      taskKey === "taskDecisionFinalCat1" ||
      taskKey === "taskDecisionFinalCat2"
    ) {
      dynamicFlags.decisionFinal = isApprove
        ? "APROBADO"
        : isReject
          ? "RECHAZADO"
          : "OBSERVADO";
      if (!values.justificacion) dynamicFlags.justificacion = resolvedComment;
    }

    const decisionPayload: Record<string, unknown> = {
      ...(isApprove ? values : {}),
      aprobado: isApprove,
      decision: action,
      estadoDecision: isApprove ? "APROBADO" : isReject ? "RECHAZADO" : "OBSERVADO",
      comentarios: resolvedComment,
      aprobadoPor: approverName,
      fechaDecision: new Date().toISOString(),
      ...dynamicFlags,
    };

    try {
      await completeMutation.mutateAsync({
        id: task.id,
        payload: { variables: decisionPayload },
      });

      if (isApprove) {
        message.success("¡Solicitud aprobada exitosamente!");
      } else if (isReject) {
        message.warning("Solicitud rechazada");
      } else {
        message.info("Observaciones enviadas al solicitante");
      }

      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErrorMessage(
        axErr.response?.data?.message ||
          axErr.message ||
          "Error al procesar la decisión de aprobación",
      );
    }
  };

  return (
    <Modal
      title={
        <Space>
          {modalConfig.icon}
          <span style={{ fontWeight: 600 }}>{modalConfig.title}</span>
          {isApprove && dynamicSchema && (
            <Tag color="blue" icon={<FormOutlined />}>
              Formulario de Verificación
            </Tag>
          )}
        </Space>
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={handleModalClose}
      okText={modalConfig.okText}
      cancelText="Volver"
      okButtonProps={modalConfig.okButtonProps}
      confirmLoading={completeMutation.isPending}
      destroyOnClose
      width={580}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%", marginTop: 12 }}>
        <Alert
          type={modalConfig.alertType}
          message={modalConfig.alertMessage}
          showIcon
        />

        {task && (
          <div
            style={{
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              Paso de Aprobación:
            </Text>
            <Text strong style={{ fontSize: 14, color: "#1e293b" }}>
              {task.name || "Revisión y Aprobación"}
            </Text>
            {task.description && (
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                {task.description}
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <Alert type="error" message={errorMessage} showIcon />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {/* Si es APROBACIÓN: se cargan los campos dinámicos que el evaluador debe completar */}
          {isApprove && (
            isLoadingForm ? (
              <Skeleton active paragraph={{ rows: 2 }} />
            ) : dynamicSchema ? (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    margin: "8px 0 12px 0",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: 6,
                  }}
                >
                  <Text strong style={{ fontSize: 13, color: "#334155" }}>
                    Campos a Completar por el Evaluador
                  </Text>
                </div>
                <DynamicFormRenderer schema={dynamicSchema} />
              </div>
            ) : null
          )}

          {/* Si es RECHAZO u OBSERVACIÓN: SOLO se muestra el campo de motivo u observaciones.
              Si es APROBACIÓN: se muestra como opcional solo si el formulario dinámico no tiene ya un campo de informe */}
          {(!isApprove || !hasSpecificCommentsField) && (
            <Form.Item
              label={
                isReject
                  ? "Motivo del Rechazo (Obligatorio)"
                  : action === "OBSERVE"
                    ? "Detalle de las Observaciones a Corregir (Obligatorio)"
                    : "Comentarios u Observaciones de Aprobación (Opcional)"
              }
              name="comentarios"
              rules={[
                {
                  required: !isApprove,
                  message: isReject
                    ? "Por favor especifica el motivo del rechazo para conocimiento del solicitante"
                    : "Por favor describe las observaciones que deben subsanarse",
                },
              ]}
            >
              <TextArea
                rows={3}
                placeholder={
                  isReject
                    ? "Describe claramente el motivo del rechazo..."
                    : action === "OBSERVE"
                      ? "Describe las observaciones y correcciones que debe subsanar el solicitante..."
                      : "Comentarios o visto bueno opcional..."
                }
              />
            </Form.Item>
          )}
        </Form>
      </Space>
    </Modal>
  );
}

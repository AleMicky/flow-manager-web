import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { Alert, Form, Input, Modal, Space, Typography, message } from "antd";
import { useState } from "react";
import { useAuthStore } from "../../../stores/auth.store";
import { useCompleteTaskMutation } from "../../tasks/hooks/useTasksQueries";
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

  const handleFinish = async (values: { comentarios?: string }) => {
    if (!task) return;
    setErrorMessage(null);

    const approverName = user?.name || user?.username || "Aprobador";

    const decisionPayload = {
      aprobado: isApprove,
      decision: action,
      estadoDecision: isApprove ? "APROBADO" : isReject ? "RECHAZADO" : "OBSERVADO",
      comentarios: values.comentarios?.trim() || (isApprove ? "Aprobado conforme" : "Sin comentarios"),
      aprobadoPor: approverName,
      fechaDecision: new Date().toISOString(),
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
        </Space>
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={() => {
        form.resetFields();
        setErrorMessage(null);
        onClose();
      }}
      okText={modalConfig.okText}
      cancelText="Volver"
      okButtonProps={modalConfig.okButtonProps}
      confirmLoading={completeMutation.isPending}
      destroyOnClose
      width={560}
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
          </div>
        )}

        {errorMessage && (
          <Alert type="error" message={errorMessage} showIcon />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish}>
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
              rows={4}
              placeholder={
                isApprove
                  ? "Ej: Se revisaron los antecedentes y presupuestos, conforme para continuar."
                  : "Describe claramente la justificación de tu decisión..."
              }
            />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}

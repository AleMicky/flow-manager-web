import {
  CheckCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import { useState } from "react";
import { useCompleteTaskMutation } from "../hooks/useTasksQueries";
import type { WorkflowTask } from "../types/tasks.types";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface CompleteTaskModalProps {
  open: boolean;
  task: WorkflowTask | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormValues {
  variablesText?: string;
}

const SAMPLE_DECISION_VARIABLES = JSON.stringify(
  {
    aprobado: true,
    comentarios: "Aprobado sin observaciones",
  },
  null,
  2,
);

export function CompleteTaskModal({
  open,
  task,
  onClose,
  onSuccess,
}: CompleteTaskModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completeMutation = useCompleteTaskMutation();

  const handleFinish = async (values: FormValues) => {
    if (!task) return;
    setErrorMessage(null);

    let parsedVariables: Record<string, unknown> | undefined = undefined;
    if (values.variablesText?.trim()) {
      try {
        parsedVariables = JSON.parse(values.variablesText);
        if (typeof parsedVariables !== "object" || parsedVariables === null) {
          throw new Error("Las variables deben ser un objeto JSON válido");
        }
      } catch (err) {
        setErrorMessage(
          `Formato de variables JSON inválido: ${err instanceof Error ? err.message : String(err)}`,
        );
        return;
      }
    }

    try {
      await completeMutation.mutateAsync({
        id: task.id,
        payload: { variables: parsedVariables },
      });
      message.success(`Tarea "${task.name || task.id}" completada con éxito`);
      form.resetFields();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string | string[] } };
        message?: string;
      };
      const apiMsg = axErr.response?.data?.message;
      const formatted = Array.isArray(apiMsg)
        ? apiMsg.join(" | ")
        : apiMsg || axErr.message || "Error al completar la tarea";
      setErrorMessage(formatted);
    }
  };

  const handleLoadSample = () => {
    form.setFieldValue("variablesText", SAMPLE_DECISION_VARIABLES);
    message.info("Plantilla de decisión cargada");
  };

  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: "#10b981" }} />
          <span>Completar Tarea</span>
        </Space>
      }
      open={open}
      onCancel={() => {
        setErrorMessage(null);
        form.resetFields();
        onClose();
      }}
      width={600}
      footer={null}
      destroyOnHidden
    >
      {task && (
        <div style={{ marginBottom: 16 }}>
          <Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Vas a registrar la finalización de esta tarea en el flujo de trabajo.
          </Paragraph>
          <div
            style={{
              background: "#0f172a",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #1e293b",
            }}
          >
            <div>
              <Text strong style={{ color: "#f8fafc" }}>
                {task.name || task.id}
              </Text>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
              ID: {task.id} | Instancia: {task.processInstanceId || "—"}
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Error al completar tarea"
          message="Error al completar tarea"
          description={errorMessage}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
              }}
            >
              <span>Variables de Salida (Opcional - JSON)</span>
              <Button
                type="link"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={handleLoadSample}
              >
                Cargar plantilla de decisión
              </Button>
            </div>
          }
          name="variablesText"
          tooltip="Datos o variables que continuarán el camino del flujo (ej. aprobado: true)."
        >
          <TextArea
            rows={5}
            placeholder={`{\n  "aprobado": true,\n  "comentarios": "Aprobación conforme"\n}`}
            style={{
              fontFamily: "monospace",
              fontSize: 12,
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={completeMutation.isPending}
              icon={<CheckCircleOutlined />}
            >
              Completar Tarea
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

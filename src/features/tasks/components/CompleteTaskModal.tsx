import {
  CheckCircleOutlined,
  CodeOutlined,
  FormOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  useCompleteTaskMutation,
  useTaskFormQuery,
  useTaskVariablesQuery,
} from "../hooks/useTasksQueries";
import type { WorkflowTask } from "../types/tasks.types";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import { TaskAntecedentsViewer } from "./TaskAntecedentsViewer";

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface CompleteTaskModalProps {
  open: boolean;
  task: WorkflowTask | null;
  onClose: () => void;
  onSuccess?: () => void;
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
  const [form] = Form.useForm();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showJsonMode, setShowJsonMode] = useState(false);

  const { data: formDto, isLoading: isLoadingForm } = useTaskFormQuery(
    task?.id,
    open && Boolean(task?.id),
  );

  const { data: antecedentsVariables } = useTaskVariablesQuery(
    task?.id,
    open && Boolean(task?.id),
  );

  const completeMutation = useCompleteTaskMutation();

  useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      form.resetFields();
      setShowJsonMode(false);
    }
  }, [open, form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    if (!task) return;
    setErrorMessage(null);

    let parsedVariables: Record<string, unknown> = {};

    if (showJsonMode || !formDto) {
      const rawText = (values.variablesText as string)?.trim();
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (typeof parsed !== "object" || parsed === null) {
            throw new Error("Las variables deben ser un objeto JSON válido");
          }
          parsedVariables = parsed;
        } catch (err) {
          setErrorMessage(
            `Formato de variables JSON inválido: ${err instanceof Error ? err.message : String(err)}`,
          );
          return;
        }
      }
    } else {
      // Tomamos directamente los campos renderizados dinámicamente
      const { variablesText: _discard, ...formFields } = values;
      parsedVariables = formFields;
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
        response?: {
          data?: {
            message?: string | string[];
            errors?: Array<{ field: string; message: string }>;
          };
        };
        message?: string;
      };

      const respData = axErr.response?.data;
      if (respData?.errors && Array.isArray(respData.errors)) {
        const errorList = respData.errors
          .map((e) => `• ${e.field || "campo"}: ${e.message}`)
          .join("\n");
        setErrorMessage(`Validación de formulario:\n${errorList}`);
        return;
      }

      const apiMsg = respData?.message;
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

  const hasDynamicForm = Boolean(formDto?.schema?.properties);

  return (
    <Modal
      title={
        <Space>
          <CheckCircleOutlined style={{ color: "#10b981" }} />
          <span>Completar Tarea</span>
          {hasDynamicForm && !showJsonMode && (
            <Tag color="blue" icon={<FormOutlined />}>
              Formulario Dinámico
            </Tag>
          )}
        </Space>
      }
      open={open}
      onCancel={() => {
        setErrorMessage(null);
        form.resetFields();
        onClose();
      }}
      width={720}
      footer={null}
      destroyOnHidden
    >
      {task && (
        <div style={{ marginBottom: 16 }}>
          <Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Registra los datos requeridos para completar y avanzar esta actividad.
          </Paragraph>
          <div
            style={{
              background: "#f8fafc",
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid #e2e8f0",
            }}
          >
            <Text strong style={{ color: "#1e293b", fontSize: 14 }}>
              {task.name || "Actividad pendiente"}
            </Text>
            {task.description && (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {task.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANTECEDENTES Y DOCUMENTOS DE LA SOLICITUD */}
      <TaskAntecedentsViewer variables={antecedentsVariables} />

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          message="Error de Validación"
          description={<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{errorMessage}</pre>}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      {isLoadingForm ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {hasDynamicForm && !showJsonMode ? (
            <>
              {formDto?.description && (
                <Alert
                  type="info"
                  message={formDto.title}
                  description={formDto.description}
                  style={{ marginBottom: 16 }}
                  showIcon
                />
              )}

              <DynamicFormRenderer schema={formDto!.schema} />

              <Divider style={{ margin: "16px 0" }} />
              <div style={{ textAlign: "right", marginBottom: 16 }}>
                <Button
                  type="link"
                  size="small"
                  icon={<CodeOutlined />}
                  onClick={() => setShowJsonMode(true)}
                >
                  Modo avanzado (Variables JSON)
                </Button>
              </div>
            </>
          ) : (
            <>
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
                    <Space>
                      {hasDynamicForm && (
                        <Button
                          type="link"
                          size="small"
                          icon={<FormOutlined />}
                          onClick={() => setShowJsonMode(false)}
                        >
                          Volver a Formulario
                        </Button>
                      )}
                      <Button
                        type="link"
                        size="small"
                        icon={<ThunderboltOutlined />}
                        onClick={handleLoadSample}
                      >
                        Cargar plantilla
                      </Button>
                    </Space>
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
            </>
          )}

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
      )}
    </Modal>
  );
}

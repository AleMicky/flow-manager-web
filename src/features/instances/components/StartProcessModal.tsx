import {
  PlayCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import { useStartProcessMutation } from "../hooks/useInstancesQueries";
import type { StartProcessPayload } from "../types/instances.types";

const { Paragraph } = Typography;
const { TextArea } = Input;

interface StartProcessModalProps {
  open: boolean;
  initialProcessKey?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormValues {
  processDefinitionKey: string;
  businessKey?: string;
  variablesText?: string;
}

const SAMPLE_VARIABLES = JSON.stringify(
  {
    solicitante: "Usuario Demo",
    concepto: "Adquisición de equipamiento informático",
    monto: 3500,
    prioridad: "alta",
  },
  null,
  2,
);

export function StartProcessModal({
  open,
  initialProcessKey,
  onClose,
  onSuccess,
}: StartProcessModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startMutation = useStartProcessMutation();
  const { data: definitionsData, isLoading: loadingDefinitions } =
    useDefinitionsQuery({ size: 100 });

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        processDefinitionKey: initialProcessKey ?? "",
        businessKey: `SOL-${Date.now().toString().slice(-6)}`,
        variablesText: "",
      });
    }
  }, [open, initialProcessKey, form]);

  const handleFinish = async (values: FormValues) => {
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
      const payload: StartProcessPayload = {
        processDefinitionKey: values.processDefinitionKey.trim(),
        businessKey: values.businessKey?.trim() || undefined,
        variables: parsedVariables,
      };

      const result = await startMutation.mutateAsync(payload);
      message.success(`Instancia iniciada correctamente (ID: ${result.id})`);
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
        : apiMsg || axErr.message || "Error al iniciar el proceso BPMN";
      setErrorMessage(formatted);
    }
  };

  const handleLoadSample = () => {
    form.setFieldValue("variablesText", SAMPLE_VARIABLES);
    message.info("Variables de ejemplo cargadas");
  };

  const definitionOptions =
    definitionsData?.data?.map((def) => ({
      value: def.key,
      label: `${def.name || def.key} (v${def.version}) [key: ${def.key}]`,
    })) ?? [];

  return (
    <Modal
      title={
        <Space>
          <PlayCircleOutlined style={{ color: "#10b981" }} />
          <span>Iniciar Proceso BPMN</span>
        </Space>
      }
      open={open}
      onCancel={() => {
        setErrorMessage(null);
        onClose();
      }}
      width={680}
      footer={null}
      destroyOnHidden
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Crea y arranca una nueva instancia de flujo de trabajo ejecutable en Flowable.
      </Paragraph>

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Error al iniciar instancia"
          message="Error al iniciar instancia"
          description={errorMessage}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Definición de Proceso (Process Definition Key)"
          name="processDefinitionKey"
          tooltip="Clave de la definición BPMN publicada en Flowable."
          rules={[
            {
              required: true,
              message: "Selecciona o ingresa la clave de definición del proceso",
            },
          ]}
        >
          <Select
            showSearch
            placeholder="Selecciona o escribe la clave del proceso..."
            loading={loadingDefinitions}
            options={definitionOptions}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        <Form.Item
          label="Clave de Negocio (Business Key)"
          name="businessKey"
          tooltip="Identificador de correlación del negocio (ej. código de solicitud o folio de compra)."
        >
          <Input placeholder="Ej: SOL-2026-001" allowClear />
        </Form.Item>

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
              <span>Variables Iniciales (JSON)</span>
              <Button
                type="link"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={handleLoadSample}
              >
                Cargar JSON de ejemplo
              </Button>
            </div>
          }
          name="variablesText"
          tooltip="Objeto JSON con variables que alimentarán el inicio del proceso."
        >
          <TextArea
            rows={6}
            placeholder={`{\n  "solicitante": "Juan Pérez",\n  "monto": 1500\n}`}
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
              loading={startMutation.isPending}
              icon={<PlayCircleOutlined />}
            >
              Iniciar Proceso
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

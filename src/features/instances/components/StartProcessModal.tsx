import {
  CodeOutlined,
  FormOutlined,
  NumberOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import type { AxiosError } from "axios";
import { useEffect, useState } from "react";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import {
  useAvailableProcessesQuery,
  useStartProcessMutation,
} from "../hooks/useInstancesQueries";
import { DynamicFormRenderer } from "../../tasks/components/DynamicFormRenderer";

const { Text } = Typography;
const { TextArea } = Input;

interface StartProcessModalProps {
  open: boolean;
  onClose: () => void;
  initialProcessKey?: string;
  defaultProcessKey?: string;
  onSuccess?: () => void;
}

const SAMPLE_VARIABLES = JSON.stringify(
  {
    objetoContratacion: "Adquisición de repuestos para turbina de gas",
    categoria: "CATEGORIA_I",
    montoEstimadoBs: 85000,
    tipoAdquisicion: "BIEN",
    adjuntoET_TDR: "ET_Repuestos_Turbina.pdf",
    adjuntoCotizacion: "Cotizacion_Referencial.pdf",
  },
  null,
  2,
);

export function StartProcessModal({
  open,
  onClose,
  initialProcessKey,
  defaultProcessKey,
  onSuccess,
}: StartProcessModalProps) {
  const [form] = Form.useForm();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const effectiveProcessKey = initialProcessKey ?? defaultProcessKey ?? null;
  const [selectedProcessKey, setSelectedProcessKey] = useState<string | null>(
    effectiveProcessKey,
  );
  const [showJsonMode, setShowJsonMode] = useState<boolean>(false);

  // Consulta de definiciones desde Flowable
  const { data: definitionsData, isLoading: loadingDefinitions } =
    useDefinitionsQuery({ size: 100 });

  // Consulta de procesos con esquema configurado en BD
  const { data: availableProcesses, isLoading: loadingAvailable } =
    useAvailableProcessesQuery();

  const startMutation = useStartProcessMutation();

  // Buscar si el proceso seleccionado tiene startFormSchema configurado
  const configuredProcess = availableProcesses?.find(
    (p) =>
      p.processDefinitionKey === selectedProcessKey ||
      p.key === selectedProcessKey,
  );

  const hasStartForm = Boolean(
    configuredProcess?.startFormSchema &&
      configuredProcess.startFormSchema.properties &&
      Object.keys(configuredProcess.startFormSchema.properties).length > 0,
  );

  useEffect(() => {
    if (open) {
      setErrorMessage(null);
      form.resetFields();
      if (effectiveProcessKey) {
        setSelectedProcessKey(effectiveProcessKey);
        form.setFieldValue("processDefinitionKey", effectiveProcessKey);
      }
      setShowJsonMode(false);
    }
  }, [open, effectiveProcessKey, form]);

  const handleFinish = async (values: Record<string, unknown>) => {
    setErrorMessage(null);

    const processDefinitionKey = values.processDefinitionKey as string;

    let parsedVariables: Record<string, unknown> = {};

    if (showJsonMode || !hasStartForm) {
      // Modo JSON crudo
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
      // Modo formulario dinámico: extraer todos los campos excepto los del sistema
      const {
        processDefinitionKey: _k,
        variablesText: _vt,
        ...dynamicFields
      } = values;
      parsedVariables = dynamicFields;
    }

    try {
      await startMutation.mutateAsync({
        processDefinitionKey,
        variables: Object.keys(parsedVariables).length > 0 ? parsedVariables : undefined,
      });

      message.success(
        `Proceso "${processDefinitionKey}" iniciado exitosamente`,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const axErr = err as AxiosError<{
        message?: string | string[];
        statusCode?: number;
        errors?: Array<{ path: string; message: string }>;
      }>;
      const respData = axErr.response?.data;

      if (respData?.errors && Array.isArray(respData.errors)) {
        const errorList = respData.errors
          .map((e) => `• Campo "${e.path}": ${e.message}`)
          .join("\n");
        setErrorMessage(`Validación de formulario:\n${errorList}`);
        return;
      }

      const apiMsg = respData?.message;
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

  // Opciones combinadas de Flowable y procesos configurados
  const combinedOptionsMap = new Map<string, { value: string; label: string }>();

  // Procesos configurados en BD
  availableProcesses?.forEach((proc) => {
    combinedOptionsMap.set(proc.processDefinitionKey, {
      value: proc.processDefinitionKey,
      label: `${proc.name} [${proc.processDefinitionKey}] (Formulario Activo)`,
    });
  });

  // Procesos desplegados en Flowable
  definitionsData?.data?.forEach((def) => {
    if (!combinedOptionsMap.has(def.key)) {
      combinedOptionsMap.set(def.key, {
        value: def.key,
        label: `${def.name || def.key} (v${def.version}) [key: ${def.key}]`,
      });
    }
  });

  const definitionOptions = Array.from(combinedOptionsMap.values());

  const prefix = configuredProcess?.codePrefix || "ADQ";
  const currentYear = new Date().getFullYear();
  const formatPattern =
    configuredProcess?.correlativeFormat || "{prefix}-{number:3}/{year}";
  const previewCorrelative = formatPattern
    .replace("{prefix}", prefix)
    .replace("{year}", String(currentYear))
    .replace(/\{number(?::(\d+))?\}/g, (_m, p) =>
      "1".padStart(p ? parseInt(p, 10) : 3, "0"),
    );

  return (
    <Modal
      title={
        <Space>
          <PlayCircleOutlined style={{ color: "#10b981" }} />
          <span>Iniciar Proceso BPMN</span>
          {hasStartForm && !showJsonMode && (
            <Tag color="blue" icon={<FormOutlined />}>
              Formulario de Inicio Dinámico
            </Tag>
          )}
        </Space>
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="Iniciar Ejecución"
      cancelText="Cancelar"
      confirmLoading={startMutation.isPending}
      destroyOnClose
      width={720}
    >
      {errorMessage && (
        <Alert
          type="error"
          message="Error de validación o ejecución"
          description={
            <pre
              style={{
                margin: 0,
                fontSize: 12,
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
              }}
            >
              {errorMessage}
            </pre>
          }
          style={{ marginBottom: 16 }}
          showIcon
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
          processDefinitionKey: effectiveProcessKey,
        }}
      >
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
            loading={loadingDefinitions || loadingAvailable}
            options={definitionOptions}
            onChange={(val) => {
              setSelectedProcessKey(val);
              setErrorMessage(null);
            }}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>

        {/* Indicador de Correlativo Oficial 100% Automático */}
        <div
          style={{
            marginBottom: 20,
            padding: "10px 14px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Space>
            <NumberOutlined style={{ color: "#16a34a" }} />
            <Text strong style={{ color: "#15803d" }}>
              Correlativo Oficial:
            </Text>
            <Text type="secondary">
              Se generará y asignará automáticamente por el sistema
            </Text>
          </Space>
          <Tag color="green" style={{ margin: 0, fontWeight: 700 }}>
            {previewCorrelative}
          </Tag>
        </div>

        {hasStartForm && !showJsonMode ? (
          <>
            {configuredProcess?.description && (
              <Alert
                type="info"
                message={configuredProcess.name}
                description={configuredProcess.description}
                style={{ marginBottom: 16 }}
                showIcon
              />
            )}

            <DynamicFormRenderer schema={configuredProcess!.startFormSchema} />

            <Divider style={{ margin: "16px 0" }} />
            <div style={{ textAlign: "right", marginBottom: 16 }}>
              <Button
                type="link"
                size="small"
                icon={<CodeOutlined />}
                onClick={() => setShowJsonMode(true)}
              >
                Cambiar a entrada JSON avanzada
              </Button>
            </div>
          </>
        ) : (
          <>
            {hasStartForm && showJsonMode && (
              <div style={{ textAlign: "right", marginBottom: 8 }}>
                <Button
                  type="link"
                  size="small"
                  icon={<FormOutlined />}
                  onClick={() => setShowJsonMode(false)}
                >
                  Volver al Formulario Visual
                </Button>
              </div>
            )}

            <Form.Item
              label={
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <span>Variables Iniciales del Proceso (JSON)</span>
                  <Button
                    type="link"
                    size="small"
                    onClick={handleLoadSample}
                    style={{ padding: 0 }}
                  >
                    Cargar variables de ejemplo
                  </Button>
                </Space>
              }
              name="variablesText"
              tooltip="Parámetros iniciales en formato JSON clave-valor requeridos por el proceso."
            >
              <TextArea
                rows={9}
                placeholder={SAMPLE_VARIABLES}
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                }}
              />
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Las variables configuradas estarán disponibles para compuertas de decisión,
              asignación de tareas y formularios subsiguientes.
            </Text>
          </>
        )}
      </Form>
    </Modal>
  );
}

import {
  CodeOutlined,
  FileAddOutlined,
  FormOutlined,
  InfoCircleOutlined,
  SendOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Collapse,
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
import { useMemo, useState } from "react";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import { useAuthStore } from "../../../stores/auth.store";
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
    descripcion: "Detalle o motivo de la solicitud",
    prioridad: "MEDIA",
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

  // Consulta de definiciones desde Flowable (solo activas y última versión para evitar listas excesivas)
  const { data: definitionsData, isLoading: loadingDefinitions } =
    useDefinitionsQuery({ size: 100, latest: true, suspended: false });

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

  const handleFinish = async (values: Record<string, unknown>) => {
    setErrorMessage(null);

    const processDefinitionKey = values.processDefinitionKey as string;

    let parsedVariables: Record<string, unknown> = {};

    if (showJsonMode) {
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
    } else if (hasStartForm) {
      // Modo formulario dinámico: extraer todos los campos excepto los de control
      const {
        processDefinitionKey: _k,
        variablesText: _vt,
        ...dynamicFields
      } = values;
      parsedVariables = dynamicFields;
    } else {
      // Proceso sin formulario dinámico: capturar campos amigables por defecto
      if (values.descripcion) {
        parsedVariables.descripcion = values.descripcion;
      }
      if (values.observaciones) {
        parsedVariables.observaciones = values.observaciones;
      }

      // Si además se incluyeron parámetros JSON en la sección avanzada
      const rawText = (values.variablesText as string)?.trim();
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText);
          if (typeof parsed === "object" && parsed !== null) {
            parsedVariables = { ...parsedVariables, ...parsed };
          }
        } catch (err) {
          setErrorMessage(
            `Parámetros avanzados JSON inválidos: ${err instanceof Error ? err.message : String(err)}`,
          );
          return;
        }
      }
    }

    const currentUser = useAuthStore.getState().user;
    if (currentUser) {
      const userName = currentUser.name || currentUser.username;
      const userIdent = currentUser.username || currentUser.id;
      parsedVariables.registradoPor = userName;
      parsedVariables.iniciador = userName;
      parsedVariables.startUserId = userIdent;
      parsedVariables.iniciadorUsername = currentUser.username;
      parsedVariables.iniciadorId = currentUser.id;
    }

    try {
      await startMutation.mutateAsync({
        processDefinitionKey,
        variables:
          Object.keys(parsedVariables).length > 0 ? parsedVariables : undefined,
      });

      message.success("¡Solicitud registrada e iniciada exitosamente!");
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
        : apiMsg || axErr.message || "Error al iniciar la solicitud";
      setErrorMessage(formatted);
    }
  };

  const handleLoadSample = () => {
    form.setFieldValue("variablesText", SAMPLE_VARIABLES);
    message.info("Variables de ejemplo cargadas");
  };

  // Opciones limpias para el usuario final (sin claves técnicas crudas como [key: xxx])
  const definitionOptions = useMemo(() => {
    const combinedOptionsMap = new Map<string, { value: string; label: string }>();

    // Procesos configurados en BD con formularios
    availableProcesses?.forEach((proc) => {
      const key = proc.processDefinitionKey || proc.key;
      combinedOptionsMap.set(key, {
        value: key,
        label: proc.name,
      });
    });

    // Procesos desplegados en Flowable (filtrando suspendidos e inactivos)
    definitionsData?.data?.forEach((def) => {
      if (!def.suspended && !combinedOptionsMap.has(def.key)) {
        const readable =
          def.name ||
          def.key
            .replace(/([A-Z])/g, " $1")
            .replace(/[-_]/g, " ")
            .trim()
            .replace(/^./, (str) => str.toUpperCase());

        combinedOptionsMap.set(def.key, {
          value: def.key,
          label: readable,
        });
      }
    });

    return Array.from(combinedOptionsMap.values());
  }, [availableProcesses, definitionsData]);

  return (
    <Modal
      title={
        <Space>
          <FileAddOutlined style={{ color: "#2563eb", fontSize: 18 }} />
          <span style={{ fontWeight: 600 }}>Iniciar Nueva Solicitud</span>
          {hasStartForm && !showJsonMode && (
            <Tag color="blue" icon={<FormOutlined />}>
              Formulario Requerido
            </Tag>
          )}
        </Space>
      }
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="Enviar Solicitud"
      cancelText="Cancelar"
      okButtonProps={{ icon: <SendOutlined /> }}
      confirmLoading={startMutation.isPending}
      destroyOnClose
      width={720}
    >
      {errorMessage && (
        <Alert
          type="error"
          message="Por favor revisa la información ingresada"
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
          label="Tipo de Trámite o Solicitud"
          name="processDefinitionKey"
          tooltip="Selecciona el trámite que deseas comenzar."
          rules={[
            {
              required: true,
              message: "Por favor selecciona el tipo de trámite a iniciar",
            },
          ]}
        >
          <Select
            showSearch
            placeholder="Selecciona el tipo de trámite..."
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

        {hasStartForm && !showJsonMode ? (
          <>
            {/* Renderizado del Formulario Dinámico Amigable */}
            <DynamicFormRenderer schema={configuredProcess!.startFormSchema} />

            {/* Enlace discreto a modo JSON solo para soporte técnico */}
            <div style={{ textAlign: "right", marginTop: 12 }}>
              <Button
                type="link"
                size="small"
                icon={<CodeOutlined />}
                onClick={() => setShowJsonMode(true)}
                style={{ fontSize: 12, color: "#94a3b8" }}
              >
                Opciones avanzadas (JSON)
              </Button>
            </div>
          </>
        ) : showJsonMode ? (
          <>
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

            <Form.Item
              label={
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                  <span>Parámetros de Entrada (JSON)</span>
                  <Button
                    type="link"
                    size="small"
                    onClick={handleLoadSample}
                    style={{ padding: 0 }}
                  >
                    Cargar datos de ejemplo
                  </Button>
                </Space>
              }
              name="variablesText"
            >
              <TextArea
                rows={7}
                placeholder={SAMPLE_VARIABLES}
                style={{
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: 12,
                }}
              />
            </Form.Item>
          </>
        ) : (
          /* Trámite sin esquema dinámico: Campos estándar y amigables */
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Form.Item
              label="Descripción o Motivo de la Solicitud"
              name="descripcion"
              rules={[
                {
                  required: true,
                  message: "Ingresa una breve descripción de tu requerimiento",
                },
              ]}
            >
              <TextArea
                rows={3}
                placeholder="Describe brevemente el objeto o motivo de este trámite..."
              />
            </Form.Item>

            <Form.Item label="Observaciones Adicionales (Opcional)" name="observaciones">
              <Input placeholder="Comentarios, notas o referencias complementarias..." />
            </Form.Item>

            {/* Sección colapsable técnica si se requiere ingresar parámetros JSON adicionales */}
            <Collapse
              ghost
              size="small"
              items={[
                {
                  key: "tech",
                  label: (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      <InfoCircleOutlined style={{ marginRight: 6 }} />
                      Parámetros técnicos adicionales (opcional)
                    </Text>
                  ),
                  children: (
                    <Form.Item name="variablesText" style={{ marginBottom: 0 }}>
                      <TextArea
                        rows={4}
                        placeholder='{"clave": "valor"}'
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                        }}
                      />
                    </Form.Item>
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Form>
    </Modal>
  );
}

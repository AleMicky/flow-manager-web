import {
  CloudUploadOutlined,
  InboxOutlined,
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
  Upload,
  message,
} from "antd";
import type { UploadProps } from "antd";
import { useState } from "react";
import { useDeployProcessMutation } from "../hooks/useDefinitionsQueries";
import type { DeployProcessPayload } from "../types/definitions.types";

const { Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

interface DeployBpmnModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<definitions
  xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:flowable="http://flowable.org/bpmn"
  targetNamespace="http://flow-manager.local">

  <process
    id="aprobacionSimple"
    name="Aprobación simple"
    isExecutable="true">

    <startEvent id="inicio" name="Inicio" />

    <userTask
      id="revisar"
      name="Revisar solicitud"
      flowable:candidateGroups="workflow-user" />

    <endEvent id="fin" name="Fin" />

    <sequenceFlow
      id="flujo1"
      sourceRef="inicio"
      targetRef="revisar" />

    <sequenceFlow
      id="flujo2"
      sourceRef="revisar"
      targetRef="fin" />

  </process>
</definitions>`;

export function DeployBpmnModal({
  open,
  onClose,
  onSuccess,
}: DeployBpmnModalProps) {
  const [form] = Form.useForm<DeployProcessPayload>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deployMutation = useDeployProcessMutation();

  const handleFinish = async (values: DeployProcessPayload) => {
    setErrorMessage(null);
    try {
      const res = await deployMutation.mutateAsync({
        name: values.name.trim(),
        xml: values.xml.trim(),
        tenantId: values.tenantId?.trim() || undefined,
      });

      const deployedCount = res.definitions?.length ?? 1;
      message.success(
        `Proceso publicado exitosamente (${deployedCount} definición/es en Flowable)`,
      );
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
        : apiMsg || axErr.message || "Error al publicar la definición BPMN";
      setErrorMessage(formatted);
    }
  };

  const uploadProps: UploadProps = {
    accept: ".bpmn,.xml,.bpmn20.xml",
    multiple: false,
    showUploadList: false,
    beforeUpload: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          form.setFieldValue("xml", content);

          // Si el nombre no está definido, deducirlo del nombre del archivo
          const currentName = form.getFieldValue("name");
          if (!currentName) {
            const cleanName = file.name
              .replace(/\.bpmn20\.xml$/i, "")
              .replace(/\.(bpmn|xml)$/i, "")
              .replace(/[^a-zA-Z0-9_-]/g, "-");
            form.setFieldValue("name", cleanName);
          }
          message.success(`Archivo "${file.name}" cargado en el editor`);
        }
      };
      reader.readAsText(file);
      return false; // Evita el upload automático por HTTP
    },
  };

  const handleLoadSample = () => {
    form.setFieldsValue({
      name: "aprobacion-simple",
      xml: SAMPLE_BPMN,
    });
    message.info("Plantilla de ejemplo cargada");
  };

  return (
    <Modal
      title={
        <Space>
          <CloudUploadOutlined style={{ color: "#2563eb" }} />
          <span>Publicar Definición BPMN 2.0</span>
        </Space>
      }
      open={open}
      onCancel={() => {
        setErrorMessage(null);
        onClose();
      }}
      width={780}
      footer={null}
      destroyOnHidden
    >
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Sube un archivo de proceso BPMN o escribe la definición XML para
        desplegarla en el motor Flowable.
      </Paragraph>

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          title="Error de validación / despliegue"
          message="Error de validación / despliegue"
          description={errorMessage}
          style={{ marginBottom: 16 }}
          closable
          onClose={() => setErrorMessage(null)}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ tenantId: "" }}
      >
        <Form.Item label="Cargar archivo BPMN">
          <Dragger {...uploadProps} style={{ padding: "12px 0" }}>
            <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
              <InboxOutlined style={{ fontSize: 32, color: "#3b82f6" }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 14 }}>
              Haz clic o arrastra aquí un archivo .bpmn, .xml o .bpmn20.xml
            </p>
            <p className="ant-upload-hint" style={{ fontSize: 12 }}>
              El contenido se importará automáticamente al formulario
            </p>
          </Dragger>
        </Form.Item>

        <Form.Item
          label="Nombre del recurso (Resource Name)"
          name="name"
          tooltip="Nombre identificador sin extensión. Solo letras, números, guiones y guiones bajos."
          rules={[
            { required: true, message: "Ingresa el nombre del recurso BPMN" },
            {
              pattern: /^[a-zA-Z0-9_-]+$/,
              message:
                "Solo se permiten caracteres alfanuméricos, guiones (-) y guiones bajos (_)",
            },
            { max: 100, message: "Máximo 100 caracteres" },
          ]}
        >
          <Input placeholder="Ej: solicitud-adquisiciones" />
        </Form.Item>

        <Form.Item
          label="Tenant ID (Opcional)"
          name="tenantId"
          tooltip="Identificador de inquilino/organización en Flowable, si aplica."
          rules={[
            {
              pattern: /^[a-zA-Z0-9_-]*$/,
              message: "Solo alfanuméricos, guiones y guiones bajos",
            },
          ]}
        >
          <Input placeholder="Ej: default o dejar en blanco" />
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
              <span>Contenido XML BPMN 2.0</span>
              <Button
                type="link"
                size="small"
                icon={<ThunderboltOutlined />}
                onClick={handleLoadSample}
              >
                Cargar plantilla de ejemplo
              </Button>
            </div>
          }
          name="xml"
          rules={[
            { required: true, message: "El contenido XML BPMN es obligatorio" },
            {
              min: 50,
              message: "El XML debe contener al menos 50 caracteres",
            },
          ]}
        >
          <TextArea
            rows={10}
            placeholder={`<?xml version="1.0" encoding="UTF-8"?>\n<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" ...>`}
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              whiteSpace: "pre",
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
          <Space>
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={deployMutation.isPending}
              icon={<CloudUploadOutlined />}
            >
              Publicar Proceso
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

import {
  CheckOutlined,
  CopyOutlined,
  DownloadOutlined,
  CodeOutlined,
} from "@ant-design/icons";
import { Alert, Button, Modal, Space, Spin, Tooltip, Typography, message } from "antd";
import { useState } from "react";
import { useDefinitionXmlQuery } from "../hooks/useDefinitionsQueries";

const { Text } = Typography;

interface BpmnXmlModalProps {
  open: boolean;
  definitionId: string | null;
  processName?: string;
  onClose: () => void;
}

export function BpmnXmlModal({
  open,
  definitionId,
  processName,
  onClose,
}: BpmnXmlModalProps) {
  const [copied, setCopied] = useState(false);
  const { data: xml, isLoading, isError, error } = useDefinitionXmlQuery(
    definitionId ?? undefined,
    open && Boolean(definitionId),
  );

  const handleCopy = async () => {
    if (!xml) return;
    try {
      await navigator.clipboard.writeText(xml);
      setCopied(true);
      message.success("XML copiado al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error("No se pudo copiar al portapapeles");
    }
  };

  const handleDownload = () => {
    if (!xml) return;
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${processName || definitionId || "proceso"}.bpmn20.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success("Archivo XML descargado");
  };

  return (
    <Modal
      title={
        <Space orientation="horizontal">
          <CodeOutlined style={{ color: "#3b82f6" }} />
          <span>Definición BPMN 2.0 (XML)</span>
          {processName && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              — {processName}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={850}
      footer={[
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
        <Tooltip key="copy" title="Copiar contenido XML">
          <Button
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
            onClick={handleCopy}
            disabled={!xml}
          >
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </Tooltip>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          disabled={!xml}
        >
          Descargar .bpmn
        </Button>,
      ]}
    >
      {isLoading && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Spin description="Cargando XML de la definición..." />
        </div>
      )}

      {isError && (
        <Alert
          type="error"
          showIcon
          title="Error al recuperar XML"
          message="Error al recuperar XML"
          description={
            (error as { response?: { status?: number; data?: { message?: string } } })?.response?.status === 403
              ? "Permiso denegado (403): Tu usuario no cuenta con los roles requeridos (workflow-admin, workflow-designer o workflow-user) para descargar o ver el XML BPMN."
              : error instanceof Error
              ? error.message
              : "No se pudo recuperar el archivo BPMN desde el motor Flowable."
          }
          style={{ margin: "16px 0" }}
        />
      )}

      {xml && (
        <div
          style={{
            marginTop: 12,
            background: "#0f172a",
            borderRadius: 8,
            padding: "16px",
            maxHeight: "520px",
            overflow: "auto",
            border: "1px solid #1e293b",
          }}
        >
          <pre
            style={{
              margin: 0,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.5,
              color: "#e2e8f0",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {xml}
          </pre>
        </div>
      )}
    </Modal>
  );
}

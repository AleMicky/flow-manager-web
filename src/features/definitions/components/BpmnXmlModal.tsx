import {
  ApartmentOutlined,
  CheckOutlined,
  CodeOutlined,
  CopyOutlined,
  DownloadOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { useMemo, useState } from "react";
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
  const [activeTab, setActiveTab] = useState("structure");

  const { data: xml, isLoading, isError, error } = useDefinitionXmlQuery(
    definitionId ?? undefined,
    open && Boolean(definitionId),
  );

  const elements = useMemo(() => {
    if (!xml) return null;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");

      const userTasks = Array.from(
        doc.getElementsByTagNameNS("*", "userTask"),
      ).map((el) => ({
        id: el.getAttribute("id") || "",
        name:
          el.getAttribute("name") || el.getAttribute("id") || "Tarea de usuario",
        assignee:
          el.getAttributeNS("*", "assignee") ||
          el.getAttribute("flowable:assignee") ||
          el.getAttribute("camunda:assignee") ||
          null,
        candidateGroups:
          el.getAttributeNS("*", "candidateGroups") ||
          el.getAttribute("flowable:candidateGroups") ||
          el.getAttribute("camunda:candidateGroups") ||
          null,
        candidateUsers:
          el.getAttributeNS("*", "candidateUsers") ||
          el.getAttribute("flowable:candidateUsers") ||
          el.getAttribute("camunda:candidateUsers") ||
          null,
      }));

      const startEvents = Array.from(
        doc.getElementsByTagNameNS("*", "startEvent"),
      ).map((el) => ({
        id: el.getAttribute("id") || "",
        name: el.getAttribute("name") || "Inicio del trámite",
      }));

      const endEvents = Array.from(
        doc.getElementsByTagNameNS("*", "endEvent"),
      ).map((el) => ({
        id: el.getAttribute("id") || "",
        name: el.getAttribute("name") || "Fin del proceso",
      }));

      const gateways = [
        ...Array.from(doc.getElementsByTagNameNS("*", "exclusiveGateway")),
        ...Array.from(doc.getElementsByTagNameNS("*", "parallelGateway")),
        ...Array.from(doc.getElementsByTagNameNS("*", "inclusiveGateway")),
      ].map((el) => ({
        id: el.getAttribute("id") || "",
        name: el.getAttribute("name") || "Compuerta de decisión",
        type: el.localName,
      }));

      const serviceTasks = Array.from(
        doc.getElementsByTagNameNS("*", "serviceTask"),
      ).map((el) => ({
        id: el.getAttribute("id") || "",
        name: el.getAttribute("name") || "Tarea de sistema (Servicio)",
      }));

      return { userTasks, startEvents, endEvents, gateways, serviceTasks };
    } catch {
      return null;
    }
  }, [xml]);

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
          <ApartmentOutlined style={{ color: "#3b82f6" }} />
          <span>Detalle y Estructura BPMN</span>
          {processName && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              — {processName}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
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
            {copied ? "Copiado" : "Copiar XML"}
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
          <Spin description="Cargando definición BPMN..." />
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
              ? "Permiso denegado (403): Tu usuario no cuenta con los roles requeridos para descargar o ver el XML BPMN."
              : error instanceof Error
              ? error.message
              : "No se pudo recuperar el archivo BPMN desde el motor Flowable."
          }
          style={{ margin: "16px 0" }}
        />
      )}

      {xml && (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "structure",
              label: (
                <Space>
                  <ApartmentOutlined />
                  <span>Estructura del Flujo</span>
                  {elements?.userTasks && (
                    <Badge
                      count={elements.userTasks.length}
                      style={{ backgroundColor: "#3b82f6" }}
                    />
                  )}
                </Space>
              ),
              children: elements ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
                  {/* Resumen métricas de nodos */}
                  <Row gutter={[12, 12]}>
                    <Col xs={12} sm={6}>
                      <Card size="small" styles={{ body: { padding: "10px 14px" } }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Tareas de Usuario
                        </Text>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#2563eb" }}>
                          {elements.userTasks.length}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" styles={{ body: { padding: "10px 14px" } }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Compuertas
                        </Text>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#8b5cf6" }}>
                          {elements.gateways.length}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" styles={{ body: { padding: "10px 14px" } }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Tareas de Servicio
                        </Text>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#10b981" }}>
                          {elements.serviceTasks.length}
                        </div>
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small" styles={{ body: { padding: "10px 14px" } }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          Puntos de Inicio / Fin
                        </Text>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "#64748b" }}>
                          {elements.startEvents.length} / {elements.endEvents.length}
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* Listado de Tareas de Usuario en el Diagrama */}
                  <div>
                    <Text strong style={{ fontSize: 13, marginBottom: 8, display: "block" }}>
                      Tareas Humanas / Formularios del Trámite:
                    </Text>
                    {elements.userTasks.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Este proceso no contiene tareas de usuario humanas (es totalmente automático)"
                      />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "300px", overflowY: "auto" }}>
                        {elements.userTasks.map((t, index) => (
                          <Card
                            key={t.id || index}
                            size="small"
                            style={{
                              borderLeft: "4px solid #3b82f6",
                              backgroundColor: "#f8fafc",
                            }}
                            styles={{ body: { padding: "8px 12px" } }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                              <div>
                                <Space>
                                  <Tag color="blue" style={{ borderRadius: 10, margin: 0 }}>
                                    #{index + 1}
                                  </Tag>
                                  <Text strong>{t.name}</Text>
                                  <Text code style={{ fontSize: 11 }}>
                                    {t.id}
                                  </Text>
                                </Space>
                              </div>

                              <Space wrap size="small">
                                {t.assignee && (
                                  <Tag icon={<UserOutlined />} color="cyan">
                                    Responsable: {t.assignee}
                                  </Tag>
                                )}
                                {t.candidateGroups && (
                                  <Tag icon={<TeamOutlined />} color="purple">
                                    Grupos: {t.candidateGroups}
                                  </Tag>
                                )}
                                {t.candidateUsers && (
                                  <Tag icon={<UserOutlined />} color="geekblue">
                                    Candidatos: {t.candidateUsers}
                                  </Tag>
                                )}
                                {!t.assignee && !t.candidateGroups && !t.candidateUsers && (
                                  <Tag color="default">
                                    Sin asignación fija en BPMN (Configurable dinámicamente)
                                  </Tag>
                                )}
                              </Space>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null,
            },
            {
              key: "xml",
              label: (
                <Space>
                  <CodeOutlined />
                  <span>Código XML BPMN</span>
                </Space>
              ),
              children: (
                <div
                  style={{
                    marginTop: 8,
                    background: "#0f172a",
                    borderRadius: 8,
                    padding: "16px",
                    maxHeight: "440px",
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
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}


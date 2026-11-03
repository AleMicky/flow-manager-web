import {
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FolderOpenOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Collapse,
  Descriptions,
  Space,
  Tag,
  Typography,
} from "antd";

const { Text } = Typography;

interface TaskAntecedentsViewerProps {
  variables?: Record<string, unknown>;
  defaultExpanded?: boolean;
}

interface FileMetadata {
  name: string;
  size?: number;
  type?: string;
  data: string;
}

function parseFileVariable(val: unknown): FileMetadata | null {
  if (!val) return null;

  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    if (obj.data && typeof obj.data === "string") {
      return {
        name: (obj.name as string) || "documento_adjunto",
        size: obj.size as number | undefined,
        type: obj.type as string | undefined,
        data: obj.data as string,
      };
    }
  }

  if (typeof val === "string") {
    // Intentar parsear si fue guardado como JSON string
    try {
      const parsed = JSON.parse(val);
      if (parsed?.data && typeof parsed.data === "string") {
        return {
          name: parsed.name || "documento_adjunto",
          size: parsed.size,
          type: parsed.type,
          data: parsed.data,
        };
      }
    } catch {
      // Ignorar error si es texto regular
    }

    // Si comienza directamente con Data URL (data:application/pdf;base64,...)
    if (val.startsWith("data:")) {
      const mimeMatch = val.match(/^data:([^;]+);/);
      const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
      let ext = "bin";
      if (mime.includes("pdf")) ext = "pdf";
      else if (mime.includes("image/png")) ext = "png";
      else if (mime.includes("image/jpeg")) ext = "jpg";

      return {
        name: `adjunto.${ext}`,
        type: mime,
        data: val,
      };
    }
  }

  return null;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function handleDownload(file: FileMetadata) {
  const link = document.createElement("a");
  link.href = file.data;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handlePreview(file: FileMetadata) {
  // Para PDFs o imágenes en base64 abrimos una pestaña nueva
  if (file.data.startsWith("data:")) {
    const newWindow = window.open();
    if (newWindow) {
      if (file.type?.includes("pdf") || file.name.endsWith(".pdf")) {
        newWindow.document.write(
          `<iframe src="${file.data}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`,
        );
      } else {
        newWindow.document.write(
          `<title>${file.name}</title><body style="margin:0; background:#222; display:flex; justify-content:center; align-items:center;"><img src="${file.data}" style="max-width:100%; max-height:100vh; object-fit:contain;" /></body>`,
        );
      }
      return;
    }
  }
  // Fallback a descarga si el navegador bloquea la apertura
  handleDownload(file);
}

export function TaskAntecedentsViewer({
  variables = {},
  defaultExpanded = true,
}: TaskAntecedentsViewerProps) {
  const entries = Object.entries(variables).filter(
    ([key]) =>
      !key.startsWith("_") &&
      key !== "initiator" &&
      key !== "authenticatedUserId",
  );

  if (entries.length === 0) {
    return null;
  }

  const fileEntries: Array<{ key: string; file: FileMetadata }> = [];
  const textEntries: Array<{ key: string; value: unknown }> = [];

  for (const [key, value] of entries) {
    const maybeFile = parseFileVariable(value);
    if (maybeFile) {
      fileEntries.push({ key, file: maybeFile });
    } else {
      textEntries.push({ key, value });
    }
  }

  const collapseItems = [
    {
      key: "antecedents-panel",
      label: (
        <Space>
          <FolderOpenOutlined style={{ color: "#3b82f6" }} />
          <Text strong>Antecedentes y Datos del Proceso</Text>
          <Badge
            count={entries.length}
            style={{
              backgroundColor: "#e0f2fe",
              color: "#0369a1",
              fontWeight: 600,
            }}
          />
          {fileEntries.length > 0 && (
            <Tag color="cyan">
              <PaperClipOutlined /> {fileEntries.length} adjunto(s)
            </Tag>
          )}
        </Space>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* Sección de Documentos Adjuntos */}
          {fileEntries.length > 0 && (
            <div>
              <Text
                type="secondary"
                strong
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Documentos y Archivos Adjuntos
              </Text>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {fileEntries.map(({ key, file }) => {
                  const isPdf =
                    file.type?.includes("pdf") ||
                    file.name.toLowerCase().endsWith(".pdf");
                  return (
                    <Card
                      key={key}
                      size="small"
                      style={{
                        background: "#f8fafc",
                        borderColor: "#e2e8f0",
                        borderRadius: 6,
                      }}
                      actions={[
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handlePreview(file)}
                        >
                          Ver
                        </Button>,
                        <Button
                          type="text"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownload(file)}
                        >
                          Descargar
                        </Button>,
                      ]}
                    >
                      <Card.Meta
                        avatar={
                          isPdf ? (
                            <FilePdfOutlined
                              style={{ fontSize: 24, color: "#ef4444" }}
                            />
                          ) : (
                            <PaperClipOutlined
                              style={{ fontSize: 24, color: "#3b82f6" }}
                            />
                          )
                        }
                        title={
                          <Text
                            ellipsis
                            title={file.name}
                            style={{ maxWidth: 180, fontWeight: 500 }}
                          >
                            {file.name}
                          </Text>
                        }
                        description={
                          <Space
                            direction="vertical"
                            size={0}
                            style={{ fontSize: 11 }}
                          >
                            <Text type="secondary">
                              Campo: <Tag style={{ margin: 0 }}>{key}</Tag>
                            </Text>
                            {file.size && (
                              <Text type="secondary">
                                {formatFileSize(file.size)}
                              </Text>
                            )}
                          </Space>
                        }
                      />
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección de Campos y Valores Previamente Registrados */}
          {textEntries.length > 0 && (
            <div>
              <Text
                type="secondary"
                strong
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Datos del Proceso y Resoluciones Previas
              </Text>
              <Descriptions
                bordered
                size="small"
                column={1}
                style={{ background: "#ffffff" }}
              >
                {textEntries.map(({ key, value }) => {
                  let renderedValue: React.ReactNode;

                  if (typeof value === "boolean") {
                    renderedValue = value ? (
                      <Tag color="success">SÍ / APROBADO</Tag>
                    ) : (
                      <Tag color="error">NO / RECHAZADO</Tag>
                    );
                  } else if (typeof value === "number") {
                    renderedValue = (
                      <Text strong style={{ color: "#0f766e" }}>
                        {value.toLocaleString()}
                      </Text>
                    );
                  } else if (typeof value === "object" && value !== null) {
                    renderedValue = (
                      <pre
                        style={{
                          margin: 0,
                          fontSize: 12,
                          background: "#f1f5f9",
                          padding: 6,
                          borderRadius: 4,
                          maxHeight: 120,
                          overflow: "auto",
                        }}
                      >
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    );
                  } else {
                    renderedValue = <Text>{String(value)}</Text>;
                  }

                  return (
                    <Descriptions.Item
                      key={key}
                      label={
                        <Text strong style={{ textTransform: "capitalize" }}>
                          {key.replace(/([A-Z])/g, " $1")}
                        </Text>
                      }
                    >
                      {renderedValue}
                    </Descriptions.Item>
                  );
                })}
              </Descriptions>
            </div>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Collapse
      items={collapseItems}
      defaultActiveKey={defaultExpanded ? ["antecedents-panel"] : []}
      style={{
        background: "#f0fdf4",
        borderColor: "#bbf7d0",
        borderRadius: 8,
        marginBottom: 16,
      }}
    />
  );
}

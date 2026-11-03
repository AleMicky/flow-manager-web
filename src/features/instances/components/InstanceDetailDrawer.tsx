import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  PauseCircleOutlined,
  PictureOutlined,
  ReloadOutlined,
  SyncOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import {
  useAvailableProcessesQuery,
  useInstanceDetailQuery,
  useInstanceDiagramQuery,
  useInstanceHistoricTasksQuery,
  useInstanceVariablesQuery,
} from "../hooks/useInstancesQueries";
import { TaskAntecedentsViewer } from "../../tasks/components/TaskAntecedentsViewer";
import {
  formatActivityName,
  getProcessFriendlyName,
} from "../utils/instanceFormatters";

const { Text } = Typography;

interface InstanceDetailDrawerProps {
  open: boolean;
  instanceId: string | null;
  onClose: () => void;
}

export function InstanceDetailDrawer({
  open,
  instanceId,
  onClose,
}: InstanceDetailDrawerProps) {
  const { data: availableProcesses } = useAvailableProcessesQuery();
  const { data: definitionsData } = useDefinitionsQuery({ size: 100 });

  const { data, isLoading, isError, error } = useInstanceDetailQuery(
    instanceId ?? undefined,
    open && Boolean(instanceId),
  );

  const {
    data: diagramUrl,
    isLoading: isLoadingDiagram,
    isError: isDiagramError,
    refetch: refetchDiagram,
  } = useInstanceDiagramQuery(
    instanceId ?? undefined,
    open && Boolean(instanceId),
  );

  const { data: variables, isLoading: isLoadingVars } =
    useInstanceVariablesQuery(
      instanceId ?? undefined,
      open && Boolean(instanceId),
    );

  const {
    data: historicTasks = [],
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
  } = useInstanceHistoricTasksQuery(
    instanceId ?? undefined,
    open && Boolean(instanceId),
  );

    const processName = data
      ? getProcessFriendlyName(
          data.processDefinitionId,
          definitionsData?.data,
          availableProcesses,
        )
      : "Trámite";

    const activityInfo = data ? formatActivityName(data.activityId) : null;

    return (
      <Drawer
        title={
          <Space>
            <FileTextOutlined style={{ color: "#2563eb" }} />
            <span>Detalle de la Solicitud</span>
            {data?.businessKey ? (
              <Tag
                color="blue"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 4,
                }}
              >
                {data.businessKey}
              </Tag>
            ) : (
              <Tag color="default">Trámite en curso</Tag>
            )}
          </Space>
        }
        placement="right"
        size={720}
        open={open}
        onClose={onClose}
      >
        {isLoading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin description="Cargando información de la solicitud..." />
          </div>
        )}

        {isError && (
          <div style={{ padding: "16px 0", color: "#ef4444" }}>
            {error instanceof Error
              ? error.message
              : "Error al cargar la información de la solicitud"}
          </div>
        )}

        {data && (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: "info",
                label: (
                  <span>
                    <FileTextOutlined /> Resumen General
                  </span>
                ),
                children: (
                  <Space direction="vertical" size="large" style={{ width: "100%" }}>
                    <Descriptions
                      bordered
                      size="small"
                      column={1}
                      title="Datos del Trámite"
                    >
                      <Descriptions.Item label="Código de Solicitud">
                        {data.businessKey ? (
                          <Tag
                            color="blue"
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              padding: "2px 8px",
                            }}
                          >
                            <FileTextOutlined style={{ marginRight: 6 }} />
                            {data.businessKey}
                          </Tag>
                        ) : (
                          <Tag color="default">Trámite en curso (Sin código manual)</Tag>
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Solicitante / Registrado por">
                        <Space size="small">
                          <UserOutlined style={{ color: "#2563eb" }} />
                          <Text strong style={{ fontSize: 13 }}>
                            {data.registradoPor || data.startUserId || "Usuario solicitante"}
                          </Text>
                        </Space>
                      </Descriptions.Item>

                      <Descriptions.Item label="Tipo de Trámite / Proceso">
                        <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
                          {processName}
                        </Text>
                      </Descriptions.Item>

                      <Descriptions.Item label="Estado de Tramitación">
                        {data.ended ? (
                          <Tag color="success" icon={<CheckCircleOutlined />}>
                            Finalizado
                          </Tag>
                        ) : data.suspended ? (
                          <Tag color="warning" icon={<PauseCircleOutlined />}>
                            Pausado
                          </Tag>
                        ) : (
                          <Tag color="processing" icon={<SyncOutlined spin />}>
                            En Proceso
                          </Tag>
                        )}
                      </Descriptions.Item>

                      <Descriptions.Item label="Etapa / Tarea Actual">
                        {data.ended ? (
                          <Tag color="default">Trámite concluido</Tag>
                        ) : (
                          <Tag
                            color={activityInfo?.isCompletedOrEmpty ? "default" : "cyan"}
                            icon={
                              activityInfo?.isCompletedOrEmpty ? undefined : (
                                <ClockCircleOutlined />
                              )
                            }
                            style={{ fontSize: 12, padding: "2px 8px" }}
                          >
                            {activityInfo?.label ?? "En proceso"}
                          </Tag>
                        )}
                      </Descriptions.Item>
                    </Descriptions>

                    {/* Información técnica reservada para soporte TI (oculta por defecto) */}
                    <Collapse
                      ghost
                      size="small"
                      items={[
                        {
                          key: "tech",
                          label: (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              <InfoCircleOutlined style={{ marginRight: 6 }} />
                              Ver información técnica del sistema (para soporte TI)
                            </Text>
                          ),
                          children: (
                            <Descriptions bordered size="small" column={1}>
                              <Descriptions.Item label="ID de Motor">
                                <Text copyable style={{ fontSize: 12 }}>
                                  {data.id}
                                </Text>
                              </Descriptions.Item>

                              <Descriptions.Item label="Definición Interna">
                                <Text copyable style={{ fontSize: 12 }}>
                                  {data.processDefinitionId}
                                </Text>
                              </Descriptions.Item>

                              {data.activityId && (
                                <Descriptions.Item label="ID Actividad Flowable">
                                  <Text style={{ fontSize: 12 }}>
                                    {data.activityId}
                                  </Text>
                                </Descriptions.Item>
                              )}

                              {data.tenantId && (
                                <Descriptions.Item label="Tenant ID">
                                  <Text style={{ fontSize: 12 }}>
                                    {data.tenantId}
                                  </Text>
                                </Descriptions.Item>
                              )}

                              <Descriptions.Item label="URL Interna Flowable">
                                <Text
                                  ellipsis
                                  style={{ maxWidth: 350, fontSize: 12 }}
                                  type="secondary"
                                >
                                  {data.url}
                                </Text>
                              </Descriptions.Item>
                            </Descriptions>
                          ),
                        },
                      ]}
                    />
                  </Space>
                ),
              },
            {
              key: "diagram",
              label: (
                <span>
                  <PictureOutlined /> Diagrama BPMN
                </span>
              ),
              children: (
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text type="secondary">
                      Progreso visual con el estado de avance actual en tiempo
                      real:
                    </Text>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => refetchDiagram()}
                    >
                      Actualizar
                    </Button>
                  </div>

                  {isLoadingDiagram && (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Spin description="Generando diagrama de proceso..." />
                    </div>
                  )}

                  {isDiagramError && (
                    <Alert
                      type="warning"
                      showIcon
                      message="Diagrama no disponible"
                      description="No se pudo renderizar el diagrama BPMN en este momento (es posible que la instancia haya concluido o no cuente con información DI de diagrama)."
                    />
                  )}

                  {!isLoadingDiagram && !isDiagramError && diagramUrl && (
                    <Card
                      style={{
                        textAlign: "center",
                        background: "#f8fafc",
                        overflowX: "auto",
                      }}
                    >
                      <Image
                        src={diagramUrl}
                        alt="Diagrama BPMN de la instancia"
                        style={{ maxWidth: "100%", height: "auto" }}
                        preview={{ mask: "Click para ampliar" }}
                      />
                    </Card>
                  )}
                </Space>
              ),
            },
            {
              key: "history",
              label: (
                <span>
                  <HistoryOutlined /> Auditoría / Tareas
                </span>
              ),
              children: (
                <Space
                  direction="vertical"
                  size="middle"
                  style={{ width: "100%" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text type="secondary">
                      Historial cronológico de pasos y aprobaciones:
                    </Text>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => refetchHistory()}
                    >
                      Actualizar
                    </Button>
                  </div>

                  {isLoadingHistory && (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Spin description="Cargando historial de tareas..." />
                    </div>
                  )}

                  {!isLoadingHistory && historicTasks.length === 0 && (
                    <Empty description="No hay tareas registradas en el historial." />
                  )}

                  {!isLoadingHistory && historicTasks.length > 0 && (
                    <Timeline
                      mode="left"
                      style={{ marginTop: 16 }}
                      items={historicTasks.map((task) => {
                        const isFinished = Boolean(task.endTime);
                        return {
                          color: isFinished ? "green" : "blue",
                          dot: isFinished ? (
                            <CheckCircleOutlined style={{ fontSize: 16 }} />
                          ) : (
                            <SyncOutlined spin style={{ fontSize: 16 }} />
                          ),
                          children: (
                            <Card
                              size="small"
                              style={{
                                marginBottom: 12,
                                borderColor: isFinished
                                  ? "#e2e8f0"
                                  : "#93c5fd",
                              }}
                            >
                              <Space
                                direction="vertical"
                                size={4}
                                style={{ width: "100%" }}
                              >
                                <Space>
                                  <Text strong>{task.name || "Tarea"}</Text>
                                  {isFinished ? (
                                    <Tag color="success">Completada</Tag>
                                  ) : (
                                    <Tag color="processing">En progreso</Tag>
                                  )}
                                </Space>

                                {task.assignee ? (
                                  <Space size="small">
                                    <UserOutlined style={{ color: "#3b82f6" }} />
                                    <Text type="secondary">
                                      Asignado a:{" "}
                                      <Text strong>{task.assignee}</Text>
                                    </Text>
                                  </Space>
                                ) : (
                                  <Text type="secondary" italic>
                                    Sin asignar
                                  </Text>
                                )}

                                <Space size="middle" style={{ fontSize: 12 }}>
                                  <span>
                                    <ClockCircleOutlined /> Inicio:{" "}
                                    {dayjs(task.startTime).format(
                                      "DD/MM/YYYY HH:mm",
                                    )}
                                  </span>
                                  {task.endTime && (
                                    <span>
                                      Fin:{" "}
                                      {dayjs(task.endTime).format(
                                        "DD/MM/YYYY HH:mm",
                                      )}
                                    </span>
                                  )}
                                </Space>
                              </Space>
                            </Card>
                          ),
                        };
                      })}
                    />
                  )}
                </Space>
              ),
            },
            {
              key: "variables",
              label: (
                <span>
                  <FileSearchOutlined /> Datos y Documentos
                </span>
              ),
              children: (
                <div>
                  {isLoadingVars ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <Spin description="Cargando datos y documentos adjuntos..." />
                    </div>
                  ) : (
                    <TaskAntecedentsViewer
                      variables={variables}
                      defaultExpanded={true}
                    />
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {!isLoading && !data && !isError && (
        <Empty description="No se encontró la instancia solicitada." />
      )}
    </Drawer>
  );
}

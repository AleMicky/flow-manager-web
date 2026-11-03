import {
  ApartmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  PictureOutlined,
  ReloadOutlined,
  SyncOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
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
import {
  useInstanceDetailQuery,
  useInstanceDiagramQuery,
  useInstanceHistoricTasksQuery,
  useInstanceVariablesQuery,
} from "../hooks/useInstancesQueries";
import { TaskAntecedentsViewer } from "../../tasks/components/TaskAntecedentsViewer";

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

  return (
    <Drawer
      title={
        <Space>
          <InfoCircleOutlined style={{ color: "#3b82f6" }} />
          <span>Detalle de Instancia</span>
          {instanceId && (
            <Text type="secondary" copyable={{ text: instanceId }}>
              {instanceId}
            </Text>
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
          <Spin description="Cargando información de la instancia..." />
        </div>
      )}

      {isError && (
        <div style={{ padding: "16px 0", color: "#ef4444" }}>
          {error instanceof Error
            ? error.message
            : "Error al cargar la instancia"}
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
                  <FileTextOutlined /> General
                </span>
              ),
              children: (
                <Descriptions
                  bordered
                  size="small"
                  column={1}
                  title="Información General"
                >
                  <Descriptions.Item label="ID de Instancia">
                    <Text copyable>{data.id}</Text>
                  </Descriptions.Item>

                  <Descriptions.Item label="Clave de Negocio (Business Key)">
                    {data.businessKey ? (
                      <Tag color="blue">{data.businessKey}</Tag>
                    ) : (
                      <Text type="secondary">Sin clave de negocio</Text>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Estado de Ejecución">
                    {data.ended ? (
                      <Badge status="default" text="Finalizado" />
                    ) : data.suspended ? (
                      <Badge status="error" text="Suspendido" />
                    ) : (
                      <Badge status="processing" text="En ejecución (Activo)" />
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Definición de Proceso">
                    <Space direction="vertical" size={2}>
                      <Text copyable>{data.processDefinitionId}</Text>
                    </Space>
                  </Descriptions.Item>

                  <Descriptions.Item label="Actividad / Tarea Actual">
                    {data.activityId ? (
                      <Tag color="geekblue" icon={<ApartmentOutlined />}>
                        {data.activityId}
                      </Tag>
                    ) : (
                      <Text type="secondary">—</Text>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="Tenant ID">
                    {data.tenantId ? (
                      <Text>{data.tenantId}</Text>
                    ) : (
                      <Text type="secondary">(Por defecto)</Text>
                    )}
                  </Descriptions.Item>

                  <Descriptions.Item label="URL en Flowable">
                    <Text ellipsis style={{ maxWidth: 300 }} type="secondary">
                      {data.url}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
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

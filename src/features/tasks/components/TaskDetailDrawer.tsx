import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import { useAvailableProcessesQuery } from "../../instances/hooks/useInstancesQueries";
import { getProcessFriendlyName } from "../../instances/utils/instanceFormatters";
import {
  useTaskDetailQuery,
  useTaskVariablesQuery,
} from "../hooks/useTasksQueries";
import { TaskAntecedentsViewer } from "./TaskAntecedentsViewer";

const { Text } = Typography;

interface TaskDetailDrawerProps {
  open: boolean;
  taskId: string | null;
  onClose: () => void;
  onClaim?: (taskId: string) => void;
  onUnclaim?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  isMyTask?: boolean;
}

export function TaskDetailDrawer({
  open,
  taskId,
  onClose,
  onClaim,
  onUnclaim,
  onComplete,
  isMyTask,
}: TaskDetailDrawerProps) {
  const { data: availableProcesses } = useAvailableProcessesQuery();
  const { data: definitionsData } = useDefinitionsQuery({ size: 100 });

  const { data, isLoading, isError, error } = useTaskDetailQuery(
    taskId ?? undefined,
    open && Boolean(taskId),
  );

  const { data: variables } = useTaskVariablesQuery(
    taskId ?? undefined,
    open && Boolean(taskId),
  );

  const processName = data?.processDefinitionId
    ? getProcessFriendlyName(
        data.processDefinitionId,
        definitionsData?.data,
        availableProcesses,
      )
    : "Trámite General";

  return (
    <Drawer
      title={
        <Space>
          <CheckSquareOutlined style={{ color: "#2563eb" }} />
          <span>Detalle de la Actividad</span>
        </Space>
      }
      placement="right"
      size={640}
      open={open}
      onClose={onClose}
      extra={
        data && (
          <Space>
            {!data.assignee && onClaim && (
              <Button
                type="primary"
                size="small"
                icon={<UserOutlined />}
                onClick={() => {
                  onClose();
                  onClaim(data.id);
                }}
              >
                Reclamar
              </Button>
            )}

            {isMyTask && onUnclaim && (
              <Popconfirm
                title="¿Liberar esta tarea?"
                description="La tarea volverá a estar disponible para que otro miembro del equipo la reclame."
                onConfirm={() => {
                  onClose();
                  onUnclaim(data.id);
                }}
                okText="Sí, liberar"
                cancelText="No"
              >
                <Button size="small" icon={<CloseCircleOutlined />}>
                  Liberar
                </Button>
              </Popconfirm>
            )}

            {isMyTask && onComplete && (
              <Button
                type="primary"
                size="small"
                style={{ background: "#10b981", borderColor: "#10b981" }}
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  onClose();
                  onComplete(data.id);
                }}
              >
                Completar
              </Button>
            )}
          </Space>
        )
      }
    >
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin description="Cargando información de la tarea..." />
        </div>
      )}

      {isError && (
        <div style={{ padding: "16px 0", color: "#ef4444" }}>
          {error instanceof Error ? error.message : "Error al cargar la tarea"}
        </div>
      )}

      {data && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Descriptions
            bordered
            size="small"
            column={1}
            title={data.name || "Actividad pendiente"}
          >
            <Descriptions.Item label="Trámite Relacionado">
              <Text strong style={{ color: "#1e293b", fontSize: 13 }}>
                {processName}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Descripción">
              {data.description ? (
                <Text>{data.description}</Text>
              ) : (
                <Text type="secondary">Sin descripción adicional</Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Asignado a">
              {data.assignee ? (
                <Space>
                  <UserOutlined style={{ color: "#3b82f6" }} />
                  <Text strong>{data.assignee}</Text>
                </Space>
              ) : (
                <Badge
                  status="warning"
                  text="Sin asignar (Disponible para reclamar)"
                />
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Prioridad">
              {data.priority > 50 ? (
                <Tag color="red">Alta</Tag>
              ) : data.priority === 50 ? (
                <Tag color="blue">Normal</Tag>
              ) : (
                <Tag color="default">Baja</Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Fecha de Asignación">
              <Space>
                <ClockCircleOutlined style={{ color: "#94a3b8" }} />
                <Text>
                  {dayjs(data.createTime).format("DD/MM/YYYY HH:mm")}
                </Text>
              </Space>
            </Descriptions.Item>

            {data.dueDate && (
              <Descriptions.Item label="Fecha Límite">
                <Text>{dayjs(data.dueDate).format("DD/MM/YYYY HH:mm")}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>

          {/* Sección colapsable técnica reservada para soporte TI */}
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
                    <Descriptions.Item label="ID de Tarea">
                      <Text copyable style={{ fontSize: 12 }}>{data.id}</Text>
                    </Descriptions.Item>
                    {data.processInstanceId && (
                      <Descriptions.Item label="ID de Instancia">
                        <Text copyable style={{ fontSize: 12 }}>{data.processInstanceId}</Text>
                      </Descriptions.Item>
                    )}
                    {data.taskDefinitionKey && (
                      <Descriptions.Item label="Clave Técnica BPMN">
                        <Text style={{ fontSize: 12 }}>{data.taskDefinitionKey}</Text>
                      </Descriptions.Item>
                    )}
                    {data.processDefinitionId && (
                      <Descriptions.Item label="Definición de Proceso">
                        <Text style={{ fontSize: 12 }}>{data.processDefinitionId}</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                ),
              },
            ]}
          />

          {/* Antecedentes, variables previas y documentos adjuntos */}
          <TaskAntecedentsViewer
            variables={variables}
            defaultExpanded={true}
          />
        </Space>
      )}

      {!isLoading && !data && !isError && (
        <Empty description="No se encontró la tarea solicitada." />
      )}
    </Drawer>
  );
}

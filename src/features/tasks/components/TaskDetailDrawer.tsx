import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
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
import { useTaskDetailQuery } from "../hooks/useTasksQueries";

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
  const { data, isLoading, isError, error } = useTaskDetailQuery(
    taskId ?? undefined,
    open && Boolean(taskId),
  );

  return (
    <Drawer
      title={
        <Space>
          <CheckSquareOutlined style={{ color: "#3b82f6" }} />
          <span>Detalle de Tarea</span>
          {taskId && <Tag color="blue">{taskId}</Tag>}
        </Space>
      }
      placement="right"
      size={560}
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
        <Descriptions
          bordered
          size="small"
          column={1}
          title={data.name || "Tarea sin nombre"}
        >
          <Descriptions.Item label="ID de Tarea">
            <Text copyable>{data.id}</Text>
          </Descriptions.Item>

          <Descriptions.Item label="Descripción">
            {data.description ? (
              <Text>{data.description}</Text>
            ) : (
              <Text type="secondary">Sin descripción</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Asignado a">
            {data.assignee ? (
              <Space>
                <UserOutlined style={{ color: "#3b82f6" }} />
                <Text strong>{data.assignee}</Text>
              </Space>
            ) : (
              <Badge status="warning" text="Sin asignar (Disponible para reclamar)" />
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Prioridad">
            {data.priority > 50 ? (
              <Tag color="red">Alta ({data.priority})</Tag>
            ) : data.priority === 50 ? (
              <Tag color="orange">Normal ({data.priority})</Tag>
            ) : (
              <Tag color="blue">Baja ({data.priority})</Tag>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Fecha de Creación">
            <Space>
              <ClockCircleOutlined style={{ color: "#94a3b8" }} />
              <Text>
                {dayjs(data.createTime).format("DD/MM/YYYY HH:mm:ss")}
              </Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="Fecha Límite (Due Date)">
            {data.dueDate ? (
              <Text>{dayjs(data.dueDate).format("DD/MM/YYYY HH:mm:ss")}</Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="ID de Instancia de Proceso">
            {data.processInstanceId ? (
              <Text copyable>{data.processInstanceId}</Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="ID de Definición de Proceso">
            {data.processDefinitionId ? (
              <Text copyable>{data.processDefinitionId}</Text>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label="Clave de Tarea (Task Definition Key)">
            {data.taskDefinitionKey ? (
              <Tag color="geekblue">{data.taskDefinitionKey}</Tag>
            ) : (
              <Text type="secondary">—</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      )}

      {!isLoading && !data && !isError && (
        <Empty description="No se encontró la tarea solicitada." />
      )}
    </Drawer>
  );
}

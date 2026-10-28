import {
  ApartmentOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Descriptions,
  Drawer,
  Empty,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useInstanceDetailQuery } from "../hooks/useInstancesQueries";

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
      size={560}
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
          {error instanceof Error ? error.message : "Error al cargar la instancia"}
        </div>
      )}

      {data && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
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
        </Space>
      )}

      {!isLoading && !data && !isError && (
        <Empty description="No se encontró la instancia solicitada." />
      )}
    </Drawer>
  );
}

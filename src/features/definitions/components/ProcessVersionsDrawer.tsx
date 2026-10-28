import { HistoryOutlined } from "@ant-design/icons";
import { Badge, Drawer, Empty, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useDefinitionVersionsQuery } from "../hooks/useDefinitionsQueries";
import type { FlowableDefinitionSummary } from "../types/definitions.types";

const { Text } = Typography;

interface ProcessVersionsDrawerProps {
  open: boolean;
  processKey: string | null;
  processName?: string;
  onClose: () => void;
  onViewXml?: (definitionId: string) => void;
}

export function ProcessVersionsDrawer({
  open,
  processKey,
  processName,
  onClose,
  onViewXml,
}: ProcessVersionsDrawerProps) {
  const { data, isLoading, isError, error } = useDefinitionVersionsQuery(
    processKey ?? undefined,
    open && Boolean(processKey),
  );

  const columns: ColumnsType<FlowableDefinitionSummary> = [
    {
      title: "Versión",
      dataIndex: "version",
      key: "version",
      width: 90,
      render: (v: number) => <Tag color="blue">v{v}</Tag>,
      sorter: (a, b) => b.version - a.version,
      defaultSortOrder: "ascend",
    },
    {
      title: "Nombre",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <Text strong>{name || record.key}</Text>
          <div style={{ fontSize: 11, color: "#64748b" }}>ID: {record.id}</div>
        </div>
      ),
    },
    {
      title: "Estado",
      dataIndex: "suspended",
      key: "suspended",
      width: 110,
      render: (suspended: boolean) =>
        suspended ? (
          <Badge status="error" text="Suspendido" />
        ) : (
          <Badge status="success" text="Activo" />
        ),
    },
    {
      title: "Acción",
      key: "action",
      width: 100,
      render: (_, record) => (
        <a
          onClick={() => {
            onClose();
            onViewXml?.(record.id);
          }}
        >
          Ver XML
        </a>
      ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <HistoryOutlined />
          <span>Historial de Versiones</span>
          {processKey && <Tag color="geekblue">{processKey}</Tag>}
        </Space>
      }
      placement="right"
      size={560}
      open={open}
      onClose={onClose}
    >
      {processName && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">Proceso: </Text>
          <Text strong>{processName}</Text>
        </div>
      )}

      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin description="Cargando historial de versiones..." />
        </div>
      )}

      {isError && (
        <div style={{ padding: "16px 0", color: "#ef4444" }}>
          {error instanceof Error ? error.message : "Error al cargar versiones"}
        </div>
      )}

      {data && data.definitions?.length > 0 ? (
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={data.definitions}
          pagination={false}
        />
      ) : (
        !isLoading && <Empty description="No se encontraron versiones publicadas." />
      )}
    </Drawer>
  );
}

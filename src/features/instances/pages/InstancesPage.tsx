import {
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useState } from "react";
import { InstanceDetailDrawer } from "../components/InstanceDetailDrawer";
import { StartProcessModal } from "../components/StartProcessModal";
import {
  useCancelInstanceMutation,
  useInstancesQuery,
} from "../hooks/useInstancesQueries";
import type { ProcessInstance } from "../types/instances.types";

const { Title, Paragraph, Text } = Typography;

export function InstancesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [businessKeyInput, setBusinessKeyInput] = useState("");
  const [definitionKeyInput, setDefinitionKeyInput] = useState("");

  const [appliedFilters, setAppliedFilters] = useState<{
    businessKey?: string;
    processDefinitionKey?: string;
  }>({});

  // Modals / Drawers state
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [detailDrawer, setDetailDrawer] = useState<{
    open: boolean;
    instanceId: string | null;
  }>({
    open: false,
    instanceId: null,
  });

  const queryParams = {
    start: (page - 1) * pageSize,
    size: pageSize,
    ...(appliedFilters.businessKey
      ? { businessKey: appliedFilters.businessKey }
      : {}),
    ...(appliedFilters.processDefinitionKey
      ? { processDefinitionKey: appliedFilters.processDefinitionKey }
      : {}),
  };

  const { data, isLoading, refetch, isFetching } =
    useInstancesQuery(queryParams);
  const cancelMutation = useCancelInstanceMutation();

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({
      businessKey: businessKeyInput.trim() || undefined,
      processDefinitionKey: definitionKeyInput.trim() || undefined,
    });
  };

  const handleResetSearch = () => {
    setBusinessKeyInput("");
    setDefinitionKeyInput("");
    setAppliedFilters({});
    setPage(1);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
  };

  const handleCancelInstance = async (id: string) => {
    try {
      await cancelMutation.mutateAsync(id);
      message.success(`Instancia ${id} cancelada exitosamente`);
      refetch();
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "Error al cancelar la instancia",
      );
    }
  };

  const hasActiveFilters = Boolean(
    appliedFilters.businessKey || appliedFilters.processDefinitionKey,
  );

  const columns: ColumnsType<ProcessInstance> = [
    {
      title: "ID de Instancia",
      dataIndex: "id",
      key: "id",
      width: 240,
      render: (id: string) => (
        <Space orientation="horizontal" size="small">
          <Text strong copyable={{ text: id }}>
            {id}
          </Text>
        </Space>
      ),
    },
    {
      title: "Clave de Negocio",
      dataIndex: "businessKey",
      key: "businessKey",
      width: 170,
      render: (bKey: string | null) =>
        bKey ? (
          <Tag color="blue">{bKey}</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            —
          </Text>
        ),
    },
    {
      title: "Definición de Proceso",
      dataIndex: "processDefinitionId",
      key: "processDefinitionId",
      ellipsis: true,
      render: (defId: string) => (
        <Tooltip title={defId}>
          <Text type="secondary">{defId}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Actividad / Tarea Actual",
      dataIndex: "activityId",
      key: "activityId",
      width: 170,
      render: (activityId: string | null) =>
        activityId ? (
          <Tag color="cyan">{activityId}</Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            (Sin actividad pendiente)
          </Text>
        ),
    },
    {
      title: "Estado",
      key: "status",
      width: 130,
      render: (_, record) => {
        if (record.ended) {
          return <Badge status="default" text="Finalizado" />;
        }
        if (record.suspended) {
          return <Badge status="error" text="Suspendido" />;
        }
        return <Badge status="processing" text="En ejecución" />;
      },
    },
    {
      title: "Acciones",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Ver detalle completo">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                setDetailDrawer({
                  open: true,
                  instanceId: record.id,
                })
              }
            >
              Detalle
            </Button>
          </Tooltip>

          <Popconfirm
            title="¿Cancelar instancia?"
            description="Se dará de baja la ejecución activa del proceso en Flowable."
            okText="Sí, cancelar"
            cancelText="No"
            okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
            onConfirm={() => handleCancelInstance(record.id)}
          >
            <Tooltip title="Terminar o cancelar ejecución">
              <Button
                type="text"
                danger
                size="small"
                icon={<CloseCircleOutlined />}
              >
                Cancelar
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Cabecera */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8, color: "#3b82f6" }} />
            Solicitudes e Instancias BPMN
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Monitoreo y gestión de instancias de flujos de trabajo en ejecución en Flowable.
          </Paragraph>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => setStartModalOpen(true)}
          >
            Iniciar Proceso
          </Button>
        </Space>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card size="small">
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Input
              placeholder="Filtrar por Business Key (ej: SOL-001)"
              value={businessKeyInput}
              onChange={(e) => setBusinessKeyInput(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 230 }}
              allowClear
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            />
            <Input
              placeholder="Filtrar por Process Definition Key"
              value={definitionKeyInput}
              onChange={(e) => setDefinitionKeyInput(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 250 }}
              allowClear
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            />
            <Button type="primary" onClick={handleSearch}>
              Filtrar
            </Button>
            {hasActiveFilters && (
              <Button onClick={handleResetSearch}>Limpiar filtros</Button>
            )}
          </Space>

          <Text type="secondary" style={{ fontSize: 13 }}>
            Instancias encontradas: <Text strong>{data?.total ?? 0}</Text>
          </Text>
        </Space>
      </Card>

      {/* Tabla Principal */}
      <Card styles={{ body: { padding: 0 } }} style={{ overflow: "hidden" }}>
        <Table<ProcessInstance>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          scroll={{ x: 880 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} instancias`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Modal para iniciar proceso */}
      <StartProcessModal
        open={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Drawer para detalle de instancia */}
      <InstanceDetailDrawer
        open={detailDrawer.open}
        instanceId={detailDrawer.instanceId}
        onClose={() => setDetailDrawer({ open: false, instanceId: null })}
      />
    </div>
  );
}

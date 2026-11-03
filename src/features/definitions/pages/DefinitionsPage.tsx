import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useState } from "react";
import { BpmnXmlModal } from "../components/BpmnXmlModal";
import { DeployBpmnModal } from "../components/DeployBpmnModal";
import { ProcessVersionsDrawer } from "../components/ProcessVersionsDrawer";
import {
  useDefinitionsQuery,
  useUpdateDefinitionStatusMutation,
} from "../hooks/useDefinitionsQueries";
import type { ProcessDefinition, QueryDefinitionsParams } from "../types/definitions.types";
import { useAuthStore } from "../../../stores/auth.store";
import { StartProcessModal } from "../../instances/components/StartProcessModal";

const { Title, Paragraph, Text } = Typography;

export function DefinitionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [latestOnly, setLatestOnly] = useState(true);

  // Modals state
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [xmlModal, setXmlModal] = useState<{
    open: boolean;
    definitionId: string | null;
    processName?: string;
  }>({
    open: false,
    definitionId: null,
  });
  const [versionsDrawer, setVersionsDrawer] = useState<{
    open: boolean;
    processKey: string | null;
    processName?: string;
  }>({
    open: false,
    processKey: null,
  });
  const [startInstanceModal, setStartInstanceModal] = useState<{
    open: boolean;
    processKey?: string;
  }>({
    open: false,
  });

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const queryParams: QueryDefinitionsParams = {
    start: (page - 1) * pageSize,
    size: pageSize,
    ...(debouncedSearch
      ? { name: debouncedSearch, key: debouncedSearch }
      : {}),
    ...(latestOnly ? { latest: true } : {}),
    ...(statusFilter === "active" ? { suspended: false } : {}),
    ...(statusFilter === "suspended" ? { suspended: true } : {}),
  };

  const { data, isLoading, refetch, isFetching } =
    useDefinitionsQuery(queryParams);

  const updateStatusMutation = useUpdateDefinitionStatusMutation();

  const handleSearch = () => {
    setPage(1);
    setDebouncedSearch(searchTerm.trim());
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setStatusFilter("all");
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

  const handleToggleStatus = async (record: ProcessDefinition) => {
    const nextAction = record.suspended ? "activate" : "suspend";
    const label = record.suspended ? "activar" : "inactivar";

    try {
      setTogglingId(record.id);
      await updateStatusMutation.mutateAsync({
        id: record.id,
        payload: { action: nextAction, includeProcessInstances: false },
      });
      message.success(
        `Proceso "${record.name || record.key}" ${
          record.suspended ? "activado" : "inactivado"
        } exitosamente`,
      );
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string } } };
      message.error(
        axErr.response?.data?.message || `Error al ${label} el proceso BPMN`,
      );
    } finally {
      setTogglingId(null);
    }
  };

  const user = useAuthStore((s) => s.user);
  const canDeploy = Boolean(
    user?.roles?.some((r) =>
      ["workflow-admin", "workflow-designer"].includes(r),
    ),
  );

  const columns: ColumnsType<ProcessDefinition> = [
    {
      title: "Proceso",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <Space orientation="horizontal" size="small">
            <Text strong style={{ fontSize: 14 }}>
              {name || record.key}
            </Text>
            {record.suspended && (
              <Tag color="error" style={{ fontSize: 11, lineHeight: "16px" }}>
                Inactivo
              </Tag>
            )}
          </Space>
          {record.description && (
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 1 }}
              style={{ margin: 0, fontSize: 12 }}
            >
              {record.description}
            </Paragraph>
          )}
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Recurso: {record.resource}
          </div>
        </div>
      ),
    },
    {
      title: "Clave (Key)",
      dataIndex: "key",
      key: "key",
      width: 180,
      render: (key: string) => <Tag color="geekblue">{key}</Tag>,
    },
    {
      title: "Versión",
      dataIndex: "version",
      key: "version",
      width: 90,
      align: "center",
      render: (version: number) => <Tag color="purple">v{version}</Tag>,
    },
    {
      title: "Estado",
      dataIndex: "suspended",
      key: "suspended",
      width: 130,
      render: (suspended: boolean) =>
        suspended ? (
          <Badge status="error" text="Inactivo" />
        ) : (
          <Badge status="success" text="Activo" />
        ),
    },
    {
      title: "Deployment ID",
      dataIndex: "deploymentId",
      key: "deploymentId",
      width: 160,
      ellipsis: true,
      render: (id: string) => (
        <Text type="secondary" copyable={{ text: id }}>
          {id}
        </Text>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 290,
      fixed: "right",
      render: (_, record) => {
        const isCurrentlyToggling = togglingId === record.id;

        return (
          <Space size="small" wrap>
            <Tooltip
              title={
                record.suspended
                  ? "Proceso suspendido/inactivo. Debe activarlo para iniciar nuevas solicitudes."
                  : "Iniciar nueva solicitud de este proceso"
              }
            >
              <Button
                type="text"
                size="small"
                disabled={record.suspended}
                style={{ color: record.suspended ? undefined : "#10b981" }}
                icon={<PlayCircleOutlined />}
                onClick={() =>
                  setStartInstanceModal({
                    open: true,
                    processKey: record.key,
                  })
                }
              >
                Iniciar
              </Button>
            </Tooltip>

            {/* Botón para Activar / Inactivar */}
            <Tooltip
              title={
                !canDeploy
                  ? "Requiere rol workflow-admin o workflow-designer"
                  : record.suspended
                  ? "Activar proceso para que aparezca en formularios y permita nuevas instancias"
                  : "Inactivar proceso para ocultarlo de formularios y bloquear nuevas instancias"
              }
            >
              <Popconfirm
                title={
                  record.suspended
                    ? "¿Activar este proceso?"
                    : "¿Inactivar (suspender) este proceso?"
                }
                description={
                  record.suspended
                    ? "Volverá a aparecer en el formulario de inicio y permitirá crear solicitudes."
                    : "Ya no se mostrará en el formulario de inicio y no se podrán crear nuevas solicitudes."
                }
                okText={record.suspended ? "Sí, activar" : "Sí, inactivar"}
                cancelText="Cancelar"
                okButtonProps={{
                  danger: !record.suspended,
                }}
                disabled={!canDeploy}
                onConfirm={() => handleToggleStatus(record)}
              >
                <Button
                  type="text"
                  size="small"
                  disabled={!canDeploy}
                  loading={isCurrentlyToggling}
                  danger={!record.suspended}
                  style={
                    record.suspended
                      ? { color: "#16a34a" }
                      : { color: "#ea580c" }
                  }
                  icon={
                    record.suspended ? (
                      <CheckCircleOutlined />
                    ) : (
                      <StopOutlined />
                    )
                  }
                >
                  {record.suspended ? "Activar" : "Inactivar"}
                </Button>
              </Popconfirm>
            </Tooltip>

            <Tooltip title="Ver y descargar XML BPMN">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={() =>
                  setXmlModal({
                    open: true,
                    definitionId: record.id,
                    processName: record.name || record.key,
                  })
                }
              >
                XML
              </Button>
            </Tooltip>

            <Tooltip title="Consultar versiones anteriores">
              <Button
                type="text"
                size="small"
                icon={<HistoryOutlined />}
                onClick={() =>
                  setVersionsDrawer({
                    open: true,
                    processKey: record.key,
                    processName: record.name || record.key,
                  })
                }
              >
                Versiones
              </Button>
            </Tooltip>
          </Space>
        );
      },
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
            <ApartmentOutlined style={{ marginRight: 8, color: "#3b82f6" }} />
            Definiciones de Procesos BPMN
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Catálogo de diagramas y flujos de trabajo publicados en el motor Flowable. Puedes activar o inactivar procesos para controlar su disponibilidad en los formularios.
          </Paragraph>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
          <Tooltip
            title={
              !canDeploy
                ? "Requiere rol workflow-admin o workflow-designer para publicar"
                : undefined
            }
          >
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => setDeployModalOpen(true)}
              disabled={!canDeploy}
            >
              Publicar Proceso
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card size="small">
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap size="middle">
            <Input
              placeholder="Buscar por nombre o clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 240 }}
              allowClear
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            />

            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
              style={{ width: 170 }}
              options={[
                { value: "all", label: "Todos los estados" },
                { value: "active", label: "Solo Activos" },
                { value: "suspended", label: "Solo Inactivos" },
              ]}
            />

            <Space size="small">
              <Switch
                size="small"
                checked={latestOnly}
                onChange={(checked) => {
                  setLatestOnly(checked);
                  setPage(1);
                }}
              />
              <Text style={{ fontSize: 13 }}>Solo última versión</Text>
            </Space>

            <Button type="primary" onClick={handleSearch}>
              Buscar
            </Button>

            {(debouncedSearch || statusFilter !== "all" || !latestOnly) && (
              <Button onClick={handleResetSearch}>Limpiar filtros</Button>
            )}
          </Space>

          <Text type="secondary" style={{ fontSize: 13 }}>
            Total registros: <Text strong>{data?.total ?? 0}</Text>
          </Text>
        </Space>
      </Card>

      {/* Tabla Principal */}
      <Card styles={{ body: { padding: 0 } }} style={{ overflow: "hidden" }}>
        <Table<ProcessDefinition>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          scroll={{ x: 850 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} procesos`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Modal para publicar BPMN */}
      <DeployBpmnModal
        open={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Modal para visualizar y descargar XML */}
      <BpmnXmlModal
        open={xmlModal.open}
        definitionId={xmlModal.definitionId}
        processName={xmlModal.processName}
        onClose={() =>
          setXmlModal({ open: false, definitionId: null })
        }
      />

      {/* Drawer para consultar historial de versiones */}
      <ProcessVersionsDrawer
        open={versionsDrawer.open}
        processKey={versionsDrawer.processKey}
        processName={versionsDrawer.processName}
        onClose={() =>
          setVersionsDrawer({ open: false, processKey: null })
        }
        onViewXml={(defId) =>
          setXmlModal({
            open: true,
            definitionId: defId,
            processName: versionsDrawer.processName,
          })
        }
      />

      {/* Modal para iniciar proceso */}
      <StartProcessModal
        open={startInstanceModal.open}
        initialProcessKey={startInstanceModal.processKey}
        onClose={() =>
          setStartInstanceModal({ open: false, processKey: undefined })
        }
      />
    </div>
  );
}

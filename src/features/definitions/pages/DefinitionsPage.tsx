import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  EyeOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Dropdown,
  Empty,
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
import type { MenuProps } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BpmnXmlModal } from "../components/BpmnXmlModal";
import { DeployBpmnModal } from "../components/DeployBpmnModal";
import { ProcessVersionsDrawer } from "../components/ProcessVersionsDrawer";
import { ProcessAssignmentsDrawer } from "../components/ProcessAssignmentsDrawer";
import {
  useDefinitionsQuery,
  useUpdateDefinitionStatusMutation,
} from "../hooks/useDefinitionsQueries";
import type { ProcessDefinition, QueryDefinitionsParams } from "../types/definitions.types";
import { useAuthStore } from "../../../stores/auth.store";
import { StartProcessModal } from "../../instances/components/StartProcessModal";
import { getErrorMessage } from "../../common";

const { Title, Paragraph, Text } = Typography;

export function DefinitionsPage() {
  const navigate = useNavigate();
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
  const [assignmentsDrawer, setAssignmentsDrawer] = useState<{
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

  const { data, isLoading, isError, error, refetch, isFetching } =
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
    const processTitle = record.name || record.key;

    try {
      setTogglingId(record.id);
      await updateStatusMutation.mutateAsync({
        id: record.id,
        payload: { action: nextAction, includeProcessInstances: false },
      });
      message.success(
        `Proceso "${processTitle}" ${
          record.suspended ? "activado" : "inactivado"
        } exitosamente`,
      );
    } catch (err: unknown) {
      message.error(
        getErrorMessage(err, `Error al ${label} el proceso "${processTitle}"`),
      );
    } finally {
      setTogglingId(null);
    }
  };

  const user = useAuthStore((s) => s.user);
  const canDeploy = Boolean(
    user?.roles?.some((r) =>
      [
        "workflow-admin",
        "workflow-designer",
        "admin",
        "realm-admin",
        "superadmin",
      ].includes(r.toLowerCase()),
    ),
  );

  const getDropdownItems = (record: ProcessDefinition): MenuProps["items"] => [
    {
      key: "xml",
      icon: <EyeOutlined />,
      label: "Ver XML / BPMN",
      onClick: () =>
        setXmlModal({
          open: true,
          definitionId: record.id,
          processName: record.name || record.key,
        }),
    },
    {
      key: "versions",
      icon: <HistoryOutlined />,
      label: "Historial de versiones",
      onClick: () =>
        setVersionsDrawer({
          open: true,
          processKey: record.key,
          processName: record.name || record.key,
        }),
    },
    {
      key: "assignments",
      icon: <TeamOutlined />,
      label: "Configurar Responsables (Keycloak)",
      onClick: () =>
        setAssignmentsDrawer({
          open: true,
          processKey: record.key,
          processName: record.name || record.key,
        }),
    },
    {
      type: "divider",
    },
    {
      key: "instances",
      icon: <FileSearchOutlined />,
      label: "Ver solicitudes activas",
      onClick: () => {
        navigate(`/solicitudes?processKey=${encodeURIComponent(record.key)}`);
      },
    },
    {
      key: "copyKey",
      icon: <CopyOutlined />,
      label: "Copiar clave (Key)",
      onClick: () => {
        navigator.clipboard.writeText(record.key);
        message.success(`Clave "${record.key}" copiada al portapapeles`);
      },
    },
  ];

  const columns: ColumnsType<ProcessDefinition> = [
    {
      title: "Proceso",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <Space align="center" size="small">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: record.suspended ? "#f1f5f9" : "#eff6ff",
              border: `1px solid ${record.suspended ? "#cbd5e1" : "#bfdbfe"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: record.suspended ? "#64748b" : "#2563eb",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            <ApartmentOutlined />
          </div>
          <div style={{ minWidth: 0 }}>
            <Space size="small" wrap>
              <Text strong style={{ fontSize: 13 }}>
                {name || record.key}
              </Text>
              {record.suspended && (
                <Tag color="warning" bordered={false} style={{ fontSize: 10, padding: "0 4px" }}>
                  Inactivo
                </Tag>
              )}
            </Space>
            {record.description && (
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 1 }}
                style={{ margin: 0, fontSize: 11, maxWidth: 360 }}
              >
                {record.description}
              </Paragraph>
            )}
            <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.2 }}>
              Recurso: <Text code style={{ fontSize: 10 }}>{record.resource}</Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Clave (Key)",
      dataIndex: "key",
      key: "key",
      width: 170,
      render: (key: string) => (
        <Tooltip title="Clic para copiar clave">
          <Tag
            color="geekblue"
            style={{
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => {
              navigator.clipboard.writeText(key);
              message.success(`Clave "${key}" copiada`);
            }}
          >
            {key}
            <CopyOutlined style={{ fontSize: 10, opacity: 0.7 }} />
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Versión",
      dataIndex: "version",
      key: "version",
      width: 90,
      align: "center",
      render: (version: number) => (
        <Tag color="purple" style={{ borderRadius: 10, fontWeight: 500 }}>
          v{version}
        </Tag>
      ),
    },
    {
      title: "Estado",
      dataIndex: "suspended",
      key: "suspended",
      width: 110,
      align: "center",
      render: (suspended: boolean) =>
        suspended ? (
          <Tag
            icon={<StopOutlined />}
            color="warning"
            style={{ borderRadius: 12, padding: "0 8px" }}
          >
            Inactivo
          </Tag>
        ) : (
          <Tag
            icon={<CheckCircleOutlined />}
            color="success"
            style={{ borderRadius: 12, padding: "0 8px" }}
          >
            Activo
          </Tag>
        ),
    },
    {
      title: "Deployment ID",
      dataIndex: "deploymentId",
      key: "deploymentId",
      width: 140,
      render: (id: string) => (
        <Tooltip title={`Deployment ID: ${id}`}>
          <Text
            type="secondary"
            copyable={{ text: id }}
            style={{ fontSize: 12, fontFamily: "monospace" }}
          >
            {id ? (id.length > 12 ? `${id.slice(0, 10)}...` : id) : "-"}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 200,
      fixed: "right",
      render: (_, record) => {
        const isCurrentlyToggling = togglingId === record.id;

        return (
          <Space size="small">
            <Tooltip
              title={
                record.suspended
                  ? "Proceso inactivo. Debe activarlo para iniciar nuevas solicitudes."
                  : "Iniciar nueva solicitud de este proceso"
              }
            >
              <Button
                type={record.suspended ? "default" : "primary"}
                size="small"
                disabled={record.suspended}
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
                  : updateStatusMutation.isPending && !isCurrentlyToggling
                  ? "Hay otra actualización en curso..."
                  : record.suspended
                  ? "Activar proceso para permitir nuevas solicitudes"
                  : "Inactivar proceso para suspender nuevas solicitudes"
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
                disabled={!canDeploy || updateStatusMutation.isPending}
                onConfirm={() => handleToggleStatus(record)}
              >
                <Button
                  size="small"
                  disabled={!canDeploy || (updateStatusMutation.isPending && !isCurrentlyToggling)}
                  loading={isCurrentlyToggling}
                  danger={!record.suspended}
                  style={
                    record.suspended
                      ? { color: "#16a34a", borderColor: "#86efac" }
                      : undefined
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

            {/* Menú Más Opciones */}
            <Dropdown
              menu={{ items: getDropdownItems(record) }}
              trigger={["click"]}
              placement="bottomRight"
            >
              <Tooltip title="Más opciones">
                <Button
                  size="small"
                  type="text"
                  icon={<MoreOutlined style={{ fontSize: 16 }} />}
                />
              </Tooltip>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const currentList = data?.data ?? [];
  const totalCount = data?.total ?? 0;
  const activeCount = currentList.filter((item) => !item.suspended).length;
  const suspendedCount = currentList.filter((item) => item.suspended).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Cabecera Compacta */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title
            level={4}
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
            }}
          >
            <ApartmentOutlined style={{ color: "#3b82f6" }} />
            Definiciones de Procesos BPMN
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Catálogo de diagramas y flujos de trabajo publicados en el motor Flowable.
          </Text>
        </div>

        <Space size="small" wrap>
          <Button
            size="small"
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
          <Tooltip
            title={
              !canDeploy
                ? "Requiere rol de administración para publicar procesos BPMN"
                : "Subir y desplegar archivo BPMN XML en el motor Flowable"
            }
          >
            <Button
              type="primary"
              size="small"
              icon={<CloudUploadOutlined />}
              onClick={() => setDeployModalOpen(true)}
              disabled={!canDeploy}
            >
              Publicar / Desplegar BPMN
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Alerta de Error si la consulta falla */}
      {isError && (
        <Alert
          type="error"
          showIcon
          message="Error al cargar el catálogo de procesos BPMN"
          description={getErrorMessage(
            error,
            "No se pudo conectar con el motor de flujos. Por favor, verifica tu conexión o intenta nuevamente.",
          )}
          action={
            <Button
              size="small"
              danger
              icon={<ReloadOutlined spin={isFetching} />}
              onClick={() => refetch()}
            >
              Reintentar
            </Button>
          }
        />
      )}

      {/* Barra de Control Compacta y Unificada (KPIs Chips + Filtros en un solo Card) */}
      <Card size="small" styles={{ body: { padding: "10px 14px" } }}>
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {/* Fila 1: KPIs Chips y totalizador */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Space size={6} wrap>
              <Tag color="blue" style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}>
                Total: <strong>{totalCount}</strong>
              </Tag>
              <Tag color="green" style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}>
                Activos: <strong>{activeCount}</strong>
              </Tag>
              <Tag
                color={suspendedCount > 0 ? "orange" : "default"}
                style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}
              >
                Inactivos: <strong>{suspendedCount}</strong>
              </Tag>
              <Tag color={latestOnly ? "geekblue" : "purple"} style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}>
                {latestOnly ? "Última Versión" : "Todas las Versiones"}
              </Tag>
            </Space>

            <Text type="secondary" style={{ fontSize: 12 }}>
              Total registros: <Text strong>{data?.total ?? 0}</Text>
            </Text>
          </div>

          {/* Fila 2: Filtros Compactos */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              paddingTop: 4,
            }}
          >
            <Space size="small" wrap>
              <Input
                size="small"
                placeholder="Buscar por nombre o clave..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  if (!val.trim()) {
                    setDebouncedSearch("");
                    setPage(1);
                  }
                }}
                onPressEnter={handleSearch}
                style={{ width: 220 }}
                allowClear
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              />

              <Select
                size="small"
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                style={{ width: 150 }}
                options={[
                  { value: "all", label: "Todos los estados" },
                  { value: "active", label: "Solo Activos" },
                  { value: "suspended", label: "Solo Inactivos" },
                ]}
              />

              <Space size={4}>
                <Switch
                  size="small"
                  checked={latestOnly}
                  onChange={(checked) => {
                    setLatestOnly(checked);
                    setPage(1);
                  }}
                />
                <Text style={{ fontSize: 12 }}>Última versión</Text>
              </Space>

              <Button size="small" type="primary" onClick={handleSearch}>
                Buscar
              </Button>

              {(debouncedSearch || statusFilter !== "all" || !latestOnly) && (
                <Button size="small" onClick={handleResetSearch}>
                  Limpiar
                </Button>
              )}
            </Space>
          </div>
        </Space>
      </Card>

      {/* Tabla Principal */}
      <Card styles={{ body: { padding: 0 } }} style={{ overflow: "hidden" }}>
        <Table<ProcessDefinition>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          scroll={{ x: 820 }}
          locale={{
            emptyText: debouncedSearch || statusFilter !== "all" || !latestOnly ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No se encontraron procesos que coincidan con los filtros aplicados"
              >
                <Button size="small" onClick={handleResetSearch}>
                  Restablecer filtros
                </Button>
              </Empty>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay procesos BPMN publicados actualmente en el motor"
              >
                {canDeploy && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<CloudUploadOutlined />}
                    onClick={() => setDeployModalOpen(true)}
                  >
                    Publicar primer proceso
                  </Button>
                )}
              </Empty>
            ),
          }}
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

      {/* Drawer para configurar asignaciones de responsables en Keycloak */}
      <ProcessAssignmentsDrawer
        open={assignmentsDrawer.open}
        processKey={assignmentsDrawer.processKey}
        processName={assignmentsDrawer.processName}
        onClose={() =>
          setAssignmentsDrawer({ open: false, processKey: null })
        }
      />
    </div>
  );
}

import {
  ApartmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FilterOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import { InstanceDetailDrawer } from "../components/InstanceDetailDrawer";
import { StartProcessModal } from "../components/StartProcessModal";
import {
  useAvailableProcessesQuery,
  useCancelInstanceMutation,
  useInstancesQuery,
} from "../hooks/useInstancesQueries";
import type { ProcessInstance, QueryInstancesParams } from "../types/instances.types";
import {
  formatActivityName,
  getProcessFriendlyName,
} from "../utils/instanceFormatters";
import { useAuthStore } from "../../../stores/auth.store";

const { Title, Text } = Typography;

export function InstancesPage() {
  const { user } = useAuthStore();

  // Verificar si el usuario actual cuenta con rol de Administrador
  const isAdmin = useMemo(() => {
    return Boolean(
      user?.roles?.some((r) =>
        ["workflow-admin", "admin", "realm-admin", "superadmin"].includes(
          r.toLowerCase(),
        ),
      ),
    );
  }, [user]);

  const [searchParams] = useSearchParams();
  const urlProcessKey = searchParams.get("processKey") || undefined;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [businessKeyInput, setBusinessKeyInput] = useState("");
  const [definitionKeyInput, setDefinitionKeyInput] = useState<string | undefined>(
    urlProcessKey,
  );
  const [startedByInput, setStartedByInput] = useState("");

  // Alcance para administradores: ver todas las solicitudes o solo las suyas
  const [adminScope, setAdminScope] = useState<"all" | "mine">("all");

  const [appliedFilters, setAppliedFilters] = useState<{
    businessKey?: string;
    processDefinitionKey?: string;
    startedBy?: string;
  }>({
    ...(urlProcessKey ? { processDefinitionKey: urlProcessKey } : {}),
  });

  useEffect(() => {
    if (urlProcessKey) {
      setDefinitionKeyInput(urlProcessKey);
      setAppliedFilters((prev) => ({
        ...prev,
        processDefinitionKey: urlProcessKey,
      }));
      setPage(1);
    }
  }, [urlProcessKey]);

  // Modals / Drawers state
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [detailDrawer, setDetailDrawer] = useState<{
    open: boolean;
    instanceId: string | null;
  }>({
    open: false,
    instanceId: null,
  });

  // Consultar catálogos para mapear nombres comprensibles y poblar filtros
  const { data: availableProcesses } = useAvailableProcessesQuery();
  const { data: definitionsData } = useDefinitionsQuery({ size: 100, latest: true });

  // Construcción de parámetros para la consulta:
  // - Si no es admin: SIEMPRE se filtra por el usuario logueado.
  // - Si es admin: ve todas, a menos que elija 'mine' o ingrese un solicitante específico.
  const queryParams: QueryInstancesParams = {
    start: (page - 1) * pageSize,
    size: pageSize,
    ...(appliedFilters.businessKey
      ? { businessKey: appliedFilters.businessKey }
      : {}),
    ...(appliedFilters.processDefinitionKey
      ? { processDefinitionKey: appliedFilters.processDefinitionKey }
      : {}),
    ...(!isAdmin && user
      ? { startedBy: user.username || user.id }
      : adminScope === "mine" && user
        ? { startedBy: user.username || user.id }
        : appliedFilters.startedBy
          ? { startedBy: appliedFilters.startedBy }
          : {}),
  };

  const { data, isLoading, refetch, isFetching } =
    useInstancesQuery(queryParams);
  const cancelMutation = useCancelInstanceMutation();

  // Opciones de tipos de trámites para el filtro
  const processFilterOptions = useMemo(() => {
    const optionsMap = new Map<string, string>();

    if (availableProcesses) {
      for (const proc of availableProcesses) {
        const key = proc.processDefinitionKey || proc.key;
        if (key && !optionsMap.has(key)) {
          optionsMap.set(key, proc.name || key);
        }
      }
    }

    if (definitionsData?.data) {
      for (const def of definitionsData.data) {
        if (def.key && !optionsMap.has(def.key)) {
          optionsMap.set(def.key, def.name || def.key);
        }
      }
    }

    return Array.from(optionsMap.entries()).map(([key, label]) => ({
      value: key,
      label,
    }));
  }, [availableProcesses, definitionsData]);

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({
      businessKey: businessKeyInput.trim() || undefined,
      processDefinitionKey: definitionKeyInput || undefined,
      startedBy: startedByInput.trim() || undefined,
    });
  };

  const handleResetSearch = () => {
    setBusinessKeyInput("");
    setDefinitionKeyInput(undefined);
    setStartedByInput("");
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

  const handleCancelInstance = async (id: string, businessKey?: string | null) => {
    try {
      await cancelMutation.mutateAsync(id);
      message.success(
        businessKey
          ? `Solicitud ${businessKey} cancelada exitosamente`
          : "Trámite cancelado exitosamente",
      );
      refetch();
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
        axErr.message ||
        "Error al cancelar la solicitud",
      );
    }
  };

  const hasActiveFilters = Boolean(
    appliedFilters.businessKey ||
    appliedFilters.processDefinitionKey ||
    appliedFilters.startedBy ||
    (isAdmin && adminScope === "mine"),
  );

  // Columnas amigables para el usuario final (con identificación del solicitante)
  const columns: ColumnsType<ProcessInstance> = [
    {
      title: "Código de Solicitud",
      dataIndex: "businessKey",
      key: "businessKey",
      width: 170,
      render: (bKey: string | null) =>
        bKey ? (
          <Tag
            color="blue"
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: 4,
            }}
          >
            <FileTextOutlined style={{ marginRight: 4 }} />
            {bKey}
          </Tag>
        ) : (
          <Tag color="default" style={{ fontSize: 11, padding: "1px 6px" }}>
            <FileTextOutlined style={{ marginRight: 4 }} />
            En curso
          </Tag>
        ),
    },
    {
      title: "Registrado por",
      key: "startedBy",
      width: 190,
      render: (_, record) => {
        const applicant = record.registradoPor || record.startUserId;
        const isMe =
          (user?.username &&
            (record.startUserId === user.username ||
              record.registradoPor === user.name ||
              record.registradoPor === user.username)) ||
          (user?.id && record.startUserId === user.id) ||
          (!isAdmin && !applicant);

        if (isMe) {
          return (
            <Space size={6}>
              <Avatar
                size={20}
                style={{ backgroundColor: "#2563eb", fontSize: 10 }}
                icon={<UserOutlined />}
              />
              <Text strong style={{ color: "#1e293b", fontSize: 12 }}>
                {user?.name || user?.username}
              </Text>
              <Tag color="blue" style={{ fontSize: 10, padding: "0 4px", margin: 0 }}>
                Tú
              </Tag>
            </Space>
          );
        }

        if (applicant) {
          return (
            <Space size={6}>
              <Avatar
                size={20}
                style={{ backgroundColor: "#64748b", fontSize: 10 }}
                icon={<UserOutlined />}
              />
              <Text style={{ fontSize: 12, color: "#334155" }}>
                {applicant}
              </Text>
            </Space>
          );
        }

        return (
          <Space size={6}>
            <Avatar
              size={20}
              style={{ backgroundColor: "#94a3b8", fontSize: 10 }}
              icon={<UserOutlined />}
            />
            <Text type="secondary" italic style={{ fontSize: 11 }}>
              Usuario solicitante
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Tipo de Trámite / Proceso",
      dataIndex: "processDefinitionId",
      key: "processDefinitionId",
      render: (defId: string) => {
        const friendlyName = getProcessFriendlyName(
          defId,
          definitionsData?.data,
          availableProcesses,
        );
        return (
          <Text strong style={{ fontSize: 12, color: "#1e293b" }}>
            {friendlyName}
          </Text>
        );
      },
    },
    {
      title: "Etapa / Paso Actual",
      dataIndex: "activityId",
      key: "activityId",
      width: 190,
      render: (activityId: string | null, record) => {
        if (record.ended) {
          return (
            <Tag color="default" style={{ fontSize: 11, padding: "1px 6px" }}>
              Trámite concluido
            </Tag>
          );
        }
        const { label, isCompletedOrEmpty } = formatActivityName(activityId);
        return (
          <Tag
            color={isCompletedOrEmpty ? "default" : "cyan"}
            icon={isCompletedOrEmpty ? undefined : <ClockCircleOutlined />}
            style={{ fontSize: 11, padding: "1px 6px" }}
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Estado",
      key: "status",
      width: 120,
      render: (_, record) => {
        if (record.ended) {
          return (
            <Tag
              color="success"
              icon={<CheckCircleOutlined />}
              style={{ fontSize: 11, padding: "1px 6px" }}
            >
              Finalizado
            </Tag>
          );
        }
        if (record.suspended) {
          return (
            <Tag
              color="warning"
              icon={<PauseCircleOutlined />}
              style={{ fontSize: 11, padding: "1px 6px" }}
            >
              Pausado
            </Tag>
          );
        }
        return (
          <Tag
            color="processing"
            icon={<SyncOutlined spin />}
            style={{ fontSize: 11, padding: "1px 6px" }}
          >
            En Proceso
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "actions",
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="primary"
            ghost
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

          <Popconfirm
            title="¿Deseas anular esta solicitud?"
            description="La tramitación de este flujo se detendrá de forma permanente."
            okText="Sí, anular"
            cancelText="Volver"
            okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
            onConfirm={() => handleCancelInstance(record.id, record.businessKey)}
          >
            <Tooltip title="Anular o cancelar trámite">
              <Button
                type="text"
                danger
                size="small"
                icon={<CloseCircleOutlined />}
              >
                Anular
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Cálculo de estadísticas resumidas para las tarjetas KPI
  const totalCount = data?.total ?? 0;
  const inProgressCount =
    data?.data?.filter((item) => !item.ended && !item.suspended).length ?? 0;
  const totalCatalogProcesses = processFilterOptions.length;

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
            <FileDoneOutlined style={{ color: "#2563eb" }} />
            Seguimiento de Solicitudes y Trámites
            {isAdmin ? (
              <Tag
                color="purple"
                icon={<CrownOutlined />}
                style={{ fontSize: 11, fontWeight: 500, padding: "0 6px" }}
              >
                Admin (Global)
              </Tag>
            ) : (
              <Tag
                color="blue"
                icon={<UserOutlined />}
                style={{ fontSize: 11, fontWeight: 500, padding: "0 6px" }}
              >
                Mis Solicitudes
              </Tag>
            )}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isAdmin
              ? "Supervisión global de todas las solicitudes y flujos de trabajo en la organización."
              : "Consulta y supervisa el avance en tiempo real de tus solicitudes registradas."}
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
          <Button
            type="primary"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setStartModalOpen(true)}
          >
            Nueva Solicitud
          </Button>
        </Space>
      </div>

      {/* Barra de Control Compacta y Unificada (KPIs Chips + Segmented + Filtros) */}
      <Card size="small" styles={{ body: { padding: "10px 14px" } }}>
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {/* Fila 1: Segmented (si es admin) + KPIs Chips y totalizador */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Space size={8} wrap align="center">
              {isAdmin && (
                <Segmented
                  size="small"
                  value={adminScope}
                  onChange={(val) => {
                    setAdminScope(val as "all" | "mine");
                    setPage(1);
                  }}
                  options={[
                    {
                      label: "Todas",
                      value: "all",
                      icon: <ApartmentOutlined />,
                    },
                    {
                      label: "Solo mías",
                      value: "mine",
                      icon: <UserOutlined />,
                    },
                  ]}
                />
              )}

              <Tag color="blue" style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}>
                Total: <strong>{totalCount}</strong>
              </Tag>
              <Tag color="green" style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}>
                En curso: <strong>{inProgressCount}</strong>
              </Tag>
              <Tag color="purple" style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}>
                Tipos de trámite: <strong>{totalCatalogProcesses}</strong>
              </Tag>
            </Space>

            <Text type="secondary" style={{ fontSize: 12 }}>
              Solicitudes encontradas: <Text strong>{data?.total ?? 0}</Text>
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
                placeholder="Buscar código (ej: SOL-001)..."
                value={businessKeyInput}
                onChange={(e) => setBusinessKeyInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 200 }}
                allowClear
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              />

              <Select
                size="small"
                placeholder="Todos los tipos de trámites"
                value={definitionKeyInput}
                onChange={(val) => setDefinitionKeyInput(val)}
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 220 }}
                options={processFilterOptions}
              />

              {isAdmin && adminScope === "all" && (
                <Input
                  size="small"
                  placeholder="Filtrar por solicitante..."
                  value={startedByInput}
                  onChange={(e) => setStartedByInput(e.target.value)}
                  onPressEnter={handleSearch}
                  style={{ width: 170 }}
                  allowClear
                  prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                />
              )}

              <Button
                size="small"
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleSearch}
              >
                Buscar
              </Button>

              {hasActiveFilters && (
                <Button size="small" onClick={handleResetSearch}>
                  Limpiar
                </Button>
              )}
            </Space>
          </div>
        </Space>
      </Card>

      {/* Tabla Principal de Solicitudes */}
      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <Table<ProcessInstance>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          scroll={{ x: 920 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  hasActiveFilters
                    ? "No se encontraron solicitudes que coincidan con los filtros aplicados."
                    : isAdmin && adminScope === "all"
                      ? "Aún no se han registrado solicitudes en el sistema."
                      : "Aún no has registrado ninguna solicitud."
                }
              >
                {!hasActiveFilters && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setStartModalOpen(true)}
                  >
                    Iniciar mi primera solicitud
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
              `${range[0]}-${range[1]} de ${total} solicitudes`,
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

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
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
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

const { Title, Paragraph, Text } = Typography;

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
      width: 200,
      render: (bKey: string | null) =>
        bKey ? (
          <Space size="small">
            <Tag
              color="blue"
              style={{
                fontSize: 13,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              <FileTextOutlined style={{ marginRight: 6 }} />
              {bKey}
            </Tag>
          </Space>
        ) : (
          <Tag color="default" style={{ fontSize: 12 }}>
            <FileTextOutlined style={{ marginRight: 4 }} />
            Trámite en curso
          </Tag>
        ),
    },
    {
      title: "Registrado por",
      key: "startedBy",
      width: 210,
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
            <Space size="small">
              <Avatar
                size={24}
                style={{ backgroundColor: "#2563eb", fontSize: 11 }}
                icon={<UserOutlined />}
              />
              <Text strong style={{ color: "#1e293b", fontSize: 13 }}>
                {user?.name || user?.username}
              </Text>
              <Tag color="blue" style={{ fontSize: 11, padding: "0 6px" }}>
                Tú
              </Tag>
            </Space>
          );
        }

        if (applicant) {
          return (
            <Space size="small">
              <Avatar
                size={24}
                style={{ backgroundColor: "#64748b", fontSize: 11 }}
                icon={<UserOutlined />}
              />
              <Text style={{ fontSize: 13, color: "#334155" }}>
                {applicant}
              </Text>
            </Space>
          );
        }

        return (
          <Space size="small">
            <Avatar
              size={24}
              style={{ backgroundColor: "#94a3b8", fontSize: 11 }}
              icon={<UserOutlined />}
            />
            <Text type="secondary" italic style={{ fontSize: 12 }}>
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
          <Space direction="vertical" size={0}>
            <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
              {friendlyName}
            </Text>
          </Space>
        );
      },
    },
    {
      title: "Etapa / Paso Actual",
      dataIndex: "activityId",
      key: "activityId",
      width: 220,
      render: (activityId: string | null, record) => {
        if (record.ended) {
          return (
            <Tag color="default" style={{ fontSize: 12 }}>
              Trámite concluido
            </Tag>
          );
        }
        const { label, isCompletedOrEmpty } = formatActivityName(activityId);
        return (
          <Tag
            color={isCompletedOrEmpty ? "default" : "cyan"}
            icon={isCompletedOrEmpty ? undefined : <ClockCircleOutlined />}
            style={{ fontSize: 12, padding: "2px 8px" }}
          >
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Estado",
      key: "status",
      width: 140,
      render: (_, record) => {
        if (record.ended) {
          return (
            <Tag
              color="success"
              icon={<CheckCircleOutlined />}
              style={{ fontSize: 12, padding: "2px 8px" }}
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
              style={{ fontSize: 12, padding: "2px 8px" }}
            >
              Pausado
            </Tag>
          );
        }
        return (
          <Tag
            color="processing"
            icon={<SyncOutlined spin />}
            style={{ fontSize: 12, padding: "2px 8px" }}
          >
            En Proceso
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "actions",
      width: 190,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
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
            Ver Detalle
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Cabecera Principal */}
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
          <Title
            level={2}
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <FileDoneOutlined style={{ marginRight: 6, color: "#2563eb" }} />
            Seguimiento de Solicitudes y Trámites
            {isAdmin ? (
              <Tag
                color="purple"
                icon={<CrownOutlined />}
                style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px" }}
              >
                Vista Administrador (Todas las solicitudes)
              </Tag>
            ) : (
              <Tag
                color="blue"
                icon={<UserOutlined />}
                style={{ fontSize: 12, fontWeight: 500, padding: "2px 8px" }}
              >
                Mis Solicitudes ({user?.name || user?.username})
              </Tag>
            )}
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            {isAdmin
              ? "Supervisión, auditoría y seguimiento global de todas las solicitudes registradas en la organización."
              : "Consulta y supervisa el avance en tiempo real de tus solicitudes registradas."}
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
            icon={<PlusOutlined />}
            onClick={() => setStartModalOpen(true)}
          >
            Iniciar Nueva Solicitud
          </Button>
        </Space>
      </div>

      {/* Tarjetas KPI de Resumen */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <FileTextOutlined style={{ color: "#3b82f6" }} />
                  <Text type="secondary">
                    {isAdmin && adminScope === "all"
                      ? "Total de Solicitudes (Global)"
                      : "Mis Solicitudes"}
                  </Text>
                </Space>
              }
              value={totalCount}
              valueStyle={{ fontWeight: 600, color: "#1e293b" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <SyncOutlined style={{ color: "#10b981" }} />
                  <Text type="secondary">En Curso (Página actual)</Text>
                </Space>
              }
              value={inProgressCount}
              valueStyle={{ fontWeight: 600, color: "#10b981" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <ApartmentOutlined style={{ color: "#8b5cf6" }} />
                  <Text type="secondary">Tipos de Trámites Disponibles</Text>
                </Space>
              }
              value={totalCatalogProcesses}
              valueStyle={{ fontWeight: 600, color: "#8b5cf6" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Barra de Filtros y Búsqueda */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          background: "#ffffff",
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {/* Selector de alcance exclusivo para Administrador */}
          {isAdmin && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                paddingBottom: 8,
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <Space>
                <Text strong style={{ fontSize: 13, color: "#475569" }}>
                  Visualizar:
                </Text>
                <Segmented
                  value={adminScope}
                  onChange={(val) => {
                    setAdminScope(val as "all" | "mine");
                    setPage(1);
                  }}
                  options={[
                    {
                      label: "Todas las solicitudes",
                      value: "all",
                      icon: <ApartmentOutlined />,
                    },
                    {
                      label: "Solo mis solicitudes",
                      value: "mine",
                      icon: <UserOutlined />,
                    },
                  ]}
                />
              </Space>

              <Tag color="purple">
                Rol: {user?.roles?.join(", ") || "Administrador"}
              </Tag>
            </div>
          )}

          <Space
            wrap
            style={{ width: "100%", justifyContent: "space-between" }}
            align="center"
          >
            <Space wrap size="middle">
              <Input
                placeholder="Buscar por código de solicitud (ej: SOL-001)..."
                value={businessKeyInput}
                onChange={(e) => setBusinessKeyInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 260 }}
                allowClear
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              />

              <Select
                placeholder="Todos los tipos de trámites"
                value={definitionKeyInput}
                onChange={(val) => setDefinitionKeyInput(val)}
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 240 }}
                options={processFilterOptions}
              />

              {/* Filtro por solicitante: disponible para administradores que visualizan todo */}
              {isAdmin && adminScope === "all" && (
                <Input
                  placeholder="Filtrar por solicitante..."
                  value={startedByInput}
                  onChange={(e) => setStartedByInput(e.target.value)}
                  onPressEnter={handleSearch}
                  style={{ width: 200 }}
                  allowClear
                  prefix={<UserOutlined style={{ color: "#94a3b8" }} />}
                />
              )}

              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={handleSearch}
              >
                Buscar
              </Button>

              {hasActiveFilters && (
                <Button onClick={handleResetSearch}>
                  Limpiar filtros
                </Button>
              )}
            </Space>

            <Text type="secondary" style={{ fontSize: 13 }}>
              Solicitudes encontradas: <Text strong>{data?.total ?? 0}</Text>
            </Text>
          </Space>
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

import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CrownOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FilterOutlined,
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import { useAuthStore } from "../../../stores/auth.store";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import { useAvailableProcessesQuery } from "../../instances/hooks/useInstancesQueries";
import { getProcessFriendlyName } from "../../instances/utils/instanceFormatters";
import { TaskAntecedentsViewer } from "../../tasks/components/TaskAntecedentsViewer";
import {
  useAvailableTasksQuery,
  useClaimTaskMutation,
  useMyTasksQuery,
  useTaskVariablesQuery,
} from "../../tasks/hooks/useTasksQueries";
import type { WorkflowTask } from "../../tasks/types/tasks.types";
import { isApprovalTask } from "../../tasks/utils/taskTypeClassifier";
import {
  ApprovalDecisionModal,
  type ApprovalActionType,
} from "../components/ApprovalDecisionModal";

const { Title, Text } = Typography;

export function ApprovalsPage() {
  const { user } = useAuthStore();

  const isAdmin = useMemo(() => {
    return Boolean(
      user?.roles?.some((r) =>
        [
          "workflow-admin",
          "admin",
          "realm-admin",
          "superadmin",
          "administrador",
        ].includes(r.toLowerCase()),
      ) ||
        ["admin", "administrador"].includes(
          (user?.username || "").toLowerCase(),
        ),
    );
  }, [user]);

  // Por defecto "all" para que muestre todo lo que el backend autoriza al usuario (incluyendo rol admin y roles asignados)
  const [viewScope, setViewScope] = useState<"all" | "mine">("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [processFilter, setProcessFilter] = useState<string | undefined>(
    undefined,
  );
  const [assigneeFilter, setAssigneeFilter] = useState("");

  // Modales y Drawers
  const [decisionModal, setDecisionModal] = useState<{
    open: boolean;
    task: WorkflowTask | null;
    action: ApprovalActionType;
  }>({
    open: false,
    task: null,
    action: "APPROVE",
  });

  const [antecedentsDrawer, setAntecedentsDrawer] = useState<{
    open: boolean;
    task: WorkflowTask | null;
  }>({
    open: false,
    task: null,
  });

  // Consultas de catálogo
  const { data: availableProcesses } = useAvailableProcessesQuery();
  const { data: definitionsData } = useDefinitionsQuery({
    size: 100,
    latest: true,
  });

  const queryParams = {
    start: 0,
    size: 100,
    ...(appliedSearch ? { name: appliedSearch } : {}),
  };

  const {
    data: mineData,
    isLoading: loadingMine,
    refetch: refetchMine,
    isFetching: fetchingMine,
  } = useMyTasksQuery(queryParams);

  const {
    data: availableData,
    isLoading: loadingAvailable,
    refetch: refetchAvailable,
    isFetching: fetchingAvailable,
  } = useAvailableTasksQuery(queryParams);

  const claimMutation = useClaimTaskMutation();

  // Identificadores del usuario en sesión
  const userTokens = useMemo(() => {
    return new Set(
      [user?.id, user?.username, user?.email]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase()),
    );
  }, [user?.id, user?.username, user?.email]);

  // Todas las tareas de aprobación devueltas por /workflow/tasks/mine (incluye asignadas por usuario, por rol/grupo y rol admin)
  const allAuthorizedApprovals = useMemo(() => {
    const map = new Map<string, WorkflowTask>();
    for (const t of mineData?.data ?? []) {
      if (isApprovalTask(t)) {
        map.set(t.id, t);
      }
    }
    if (isAdmin) {
      for (const t of availableData?.data ?? []) {
        if (isApprovalTask(t)) {
          map.set(t.id, t);
        }
      }
    }
    return Array.from(map.values());
  }, [mineData?.data, availableData?.data, isAdmin]);

  // Tareas con assignee directo al usuario o sin assignee de otro usuario
  const strictlyMineApprovals = useMemo(() => {
    return allAuthorizedApprovals.filter((task) => {
      if (!task.assignee) return true;
      return userTokens.has(task.assignee.toLowerCase());
    });
  }, [allAuthorizedApprovals, userTokens]);

  // Detectar si el usuario tiene visibilidad admin (por JWT o porque el backend le devuelve tareas de otros usuarios por su rol en Keycloak)
  const hasAdminVisibility = useMemo(() => {
    if (isAdmin) return true;
    return allAuthorizedApprovals.some(
      (t) => t.assignee && !userTokens.has(t.assignee.toLowerCase()),
    );
  }, [isAdmin, allAuthorizedApprovals, userTokens]);

  // Aplicar filtros de UI (proceso, asignado y selector Como Admin / Como Asignado)
  const activeList = useMemo(() => {
    const source =
      hasAdminVisibility && viewScope === "mine"
        ? strictlyMineApprovals
        : allAuthorizedApprovals;
    const assigneeQuery = assigneeFilter.trim().toLowerCase();

    return source.filter((task) => {
      if (processFilter) {
        const defKey = task.processDefinitionId?.split(":")[0] || "";
        if (defKey !== processFilter) return false;
      }

      if (assigneeQuery) {
        const currentAssignee = (task.assignee || "sin asignar").toLowerCase();
        if (!currentAssignee.includes(assigneeQuery)) return false;
      }

      return true;
    });
  }, [
    hasAdminVisibility,
    viewScope,
    strictlyMineApprovals,
    allAuthorizedApprovals,
    processFilter,
    assigneeFilter,
  ]);

  const myPendingCount = strictlyMineApprovals.length;
  const adminTotalCount = allAuthorizedApprovals.length;
  const effectiveScope: "all" | "mine" = hasAdminVisibility ? viewScope : "mine";

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeList.slice(start, start + pageSize);
  }, [activeList, page, pageSize]);

  // Opciones de filtro por proceso
  const processFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const def of definitionsData?.data ?? []) {
      if (def.key && !map.has(def.key)) {
        map.set(def.key, def.name || def.key);
      }
    }
    for (const proc of availableProcesses ?? []) {
      if (proc.key && !map.has(proc.key)) {
        map.set(proc.key, proc.name || proc.key);
      }
    }
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [definitionsData?.data, availableProcesses]);

  // Variables y antecedentes de la tarea seleccionada en el drawer
  const { data: drawerVariables, isLoading: loadingVariables } =
    useTaskVariablesQuery(
      antecedentsDrawer.task?.id,
      antecedentsDrawer.open && Boolean(antecedentsDrawer.task?.id),
    );

  const handleSearch = () => {
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setProcessFilter(undefined);
    setAssigneeFilter("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    appliedSearch || processFilter || assigneeFilter.trim(),
  );

  const handleClaim = useCallback(
    async (task: WorkflowTask) => {
      try {
        await claimMutation.mutateAsync(task.id);
        message.success(`Solicitud "${task.name}" asignada a tu bandeja`);
        refetchMine();
        refetchAvailable();
      } catch (err: unknown) {
        const axErr = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        message.error(
          axErr.response?.data?.message ||
            axErr.message ||
            "Error al tomar la solicitud para evaluación",
        );
      }
    },
    [claimMutation, refetchMine, refetchAvailable],
  );

  const openDecisionModal = useCallback(
    (task: WorkflowTask, action: ApprovalActionType) => {
      setDecisionModal({
        open: true,
        task,
        action,
      });
    },
    [],
  );

  const openAntecedents = useCallback((task: WorkflowTask) => {
    setAntecedentsDrawer({
      open: true,
      task,
    });
  }, []);

  // Columnas compactas adaptadas según el filtro activo (Como Asignado vs Como Admin)
  const columns: ColumnsType<WorkflowTask> = useMemo(
    () => [
      {
        title: "Trámite / Proceso",
        dataIndex: "processDefinitionId",
        key: "processDefinitionId",
        ellipsis: true,
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
        title: "Paso de Aprobación",
        dataIndex: "name",
        key: "name",
        render: (name: string, record) => (
          <Space direction="vertical" size={1}>
            <Tag
              color={effectiveScope === "all" ? "cyan" : "geekblue"}
              style={{ fontSize: 11, padding: "1px 8px", margin: 0 }}
            >
              <ApartmentOutlined style={{ marginRight: 5 }} />
              {name || "Revisión y Aprobación"}
            </Tag>
            {record.description && (
              <Text
                type="secondary"
                ellipsis={{ tooltip: record.description }}
                style={{ fontSize: 11, maxWidth: 260 }}
              >
                {record.description}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: "Fecha",
        dataIndex: "createTime",
        key: "createTime",
        width: 140,
        render: (date: string) => (
          <Space size={4}>
            <ClockCircleOutlined style={{ color: "#94a3b8", fontSize: 12 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "—"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Estado / Asignación",
        key: "decisionStatus",
        width: 175,
        render: (_, record) => {
          const isAssignedToMe = Boolean(
            record.assignee && userTokens.has(record.assignee.toLowerCase()),
          );

          if (effectiveScope === "all") {
            if (!record.assignee) {
              return (
                <Tag
                  color="blue"
                  icon={<InboxOutlined />}
                  style={{ fontSize: 11, padding: "1px 8px", margin: 0 }}
                >
                  Sin asignar
                </Tag>
              );
            }
            if (isAssignedToMe) {
              return (
                <Tag
                  color="gold"
                  icon={<UserOutlined />}
                  style={{ fontSize: 11, padding: "1px 8px", margin: 0 }}
                >
                  Asignado a mí
                </Tag>
              );
            }
            return (
              <Tag
                color="geekblue"
                icon={<UserOutlined />}
                style={{ fontSize: 11, padding: "1px 8px", margin: 0 }}
              >
                @{record.assignee}
              </Tag>
            );
          }

          return (
            <Tag
              color="gold"
              icon={<ExclamationCircleOutlined />}
              style={{ fontSize: 11, padding: "1px 8px", margin: 0 }}
            >
              Pendiente de tu VoBo
            </Tag>
          );
        },
      },
      {
        title: "Acciones Ejecutivas",
        key: "actions",
        width: effectiveScope === "all" ? 390 : 310,
        fixed: "right",
        render: (_, record) => {
          const isAssignedToMe = Boolean(
            record.assignee && userTokens.has(record.assignee.toLowerCase()),
          );

          return (
            <Space size={4}>
              <Tooltip title="Ver documentos y antecedentes de la solicitud">
                <Button
                  size="small"
                  icon={<FileSearchOutlined />}
                  onClick={() => openAntecedents(record)}
                  style={{ fontSize: 12 }}
                >
                  Antecedentes
                </Button>
              </Tooltip>

              <Tooltip title="Aprobar solicitud y avanzar trámite">
                <Button
                  type="primary"
                  size="small"
                  icon={<CheckOutlined />}
                  style={{
                    backgroundColor: "#16a34a",
                    borderColor: "#16a34a",
                    fontSize: 12,
                  }}
                  onClick={() => openDecisionModal(record, "APPROVE")}
                >
                  Aprobar
                </Button>
              </Tooltip>

              <Tooltip title="Devolver con observaciones para corrección">
                <Button
                  size="small"
                  style={{
                    color: "#d97706",
                    borderColor: "#d97706",
                    fontSize: 12,
                  }}
                  onClick={() => openDecisionModal(record, "OBSERVE")}
                >
                  Observar
                </Button>
              </Tooltip>

              <Tooltip title="Rechazar solicitud con motivo justificado">
                <Button
                  danger
                  size="small"
                  icon={<CloseOutlined />}
                  style={{ fontSize: 12 }}
                  onClick={() => openDecisionModal(record, "REJECT")}
                >
                  Rechazar
                </Button>
              </Tooltip>

              {effectiveScope === "all" && !isAssignedToMe && (
                <Tooltip
                  title={
                    record.assignee
                      ? "Reasignar a mi bandeja"
                      : "Tomar solicitud para mi evaluación"
                  }
                >
                  <Button
                    size="small"
                    icon={<ThunderboltOutlined />}
                    loading={claimMutation.isPending}
                    onClick={() => handleClaim(record)}
                    style={{ fontSize: 12 }}
                  >
                    {record.assignee ? "Reasignarme" : "Tomar"}
                  </Button>
                </Tooltip>
              )}
            </Space>
          );
        },
      },
    ],
    [
      definitionsData?.data,
      availableProcesses,
      effectiveScope,
      userTokens,
      openAntecedents,
      openDecisionModal,
      claimMutation.isPending,
      handleClaim,
    ],
  );

  const isLoading = loadingMine || (hasAdminVisibility && loadingAvailable);
  const isFetching = fetchingMine || (hasAdminVisibility && fetchingAvailable);

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
            <FileDoneOutlined style={{ color: "#d97706" }} />
            Bandeja de Aprobaciones y Vistos Buenos
            {hasAdminVisibility && effectiveScope === "all" ? (
              <Tag
                color="purple"
                icon={<CrownOutlined />}
                style={{ fontSize: 11, fontWeight: 500, padding: "0 6px" }}
              >
                Modo Admin (Global)
              </Tag>
            ) : (
              <Tag
                color="gold"
                icon={<UserOutlined />}
                style={{ fontSize: 11, fontWeight: 500, padding: "0 6px" }}
              >
                Asignadas a mí
              </Tag>
            )}
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {hasAdminVisibility && effectiveScope === "all"
              ? "Supervisión global de todas las aprobaciones en curso y toma de decisiones ejecutivas."
              : "Solicitudes asignadas directamente a tu usuario que requieren visto bueno o decisión ejecutiva."}
          </Text>
        </div>

        <Space size="small" wrap>
          <Button
            size="small"
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => {
              refetchMine();
              refetchAvailable();
            }}
          >
            Actualizar
          </Button>
        </Space>
      </div>

      {/* Barra de Control Compacta y Unificada (Selector Admin/Asignado + KPIs Chips + Filtros) */}
      <Card
        size="small"
        styles={{ body: { padding: "10px 14px" } }}
        style={{ borderRadius: 8, borderColor: "#e2e8f0" }}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          {/* Fila 1: Selector de vista (si es Admin) + Chips de Resumen */}
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
              {hasAdminVisibility && (
                <Segmented
                  size="small"
                  value={effectiveScope}
                  onChange={(val) => {
                    setViewScope(val as "mine" | "all");
                    setPage(1);
                  }}
                  options={[
                    {
                      label: `Como Admin (${adminTotalCount})`,
                      value: "all",
                      icon: <CrownOutlined />,
                    },
                    {
                      label: `Como Asignado (${myPendingCount})`,
                      value: "mine",
                      icon: <UserOutlined />,
                    },
                  ]}
                />
              )}

              <Tag
                color="gold"
                style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}
              >
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                Asignadas a mí: <strong>{myPendingCount}</strong>
              </Tag>

              {hasAdminVisibility && (
                <Tag
                  color="purple"
                  style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}
                >
                  <CrownOutlined style={{ marginRight: 4 }} />
                  Total sistema: <strong>{adminTotalCount}</strong>
                </Tag>
              )}

              <Tag
                color="green"
                style={{ margin: 0, fontSize: 11, padding: "1px 8px" }}
              >
                <CheckCircleOutlined style={{ marginRight: 4 }} />
                Revisor:{" "}
                <strong>{user?.name || user?.username || "Usuario"}</strong>
              </Tag>
            </Space>

            <Text type="secondary" style={{ fontSize: 12 }}>
              Mostrando: <Text strong>{activeList.length}</Text> solicitudes
            </Text>
          </div>

          {/* Fila 2: Filtros de Búsqueda Compactos */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Space size="small" wrap>
              <Input
                size="small"
                placeholder="Buscar por paso de aprobación..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 210 }}
                allowClear
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              />

              <Select
                size="small"
                placeholder="Todos los tipos de trámite"
                value={processFilter}
                onChange={(val) => {
                  setProcessFilter(val);
                  setPage(1);
                }}
                allowClear
                showSearch
                optionFilterProp="label"
                style={{ width: 220 }}
                options={processFilterOptions}
              />

              {hasAdminVisibility && effectiveScope === "all" && (
                <Input
                  size="small"
                  placeholder="Filtrar por asignado (@usuario)..."
                  value={assigneeFilter}
                  onChange={(e) => {
                    setAssigneeFilter(e.target.value);
                    setPage(1);
                  }}
                  style={{ width: 190 }}
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

      {/* Tabla Compacta de Aprobaciones */}
      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <Table<WorkflowTask>
          size="small"
          rowKey="id"
          columns={columns}
          dataSource={paginatedData}
          loading={isLoading}
          scroll={{ x: effectiveScope === "all" ? 880 : 800 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ margin: "24px 0" }}
                description={
                  hasActiveFilters
                    ? "No se encontraron aprobaciones con los filtros aplicados."
                    : effectiveScope === "all"
                      ? "No hay solicitudes pendientes de aprobación en el sistema."
                      : "No tienes solicitudes pendientes de aprobación asignadas en este momento."
                }
              />
            ),
          }}
          pagination={{
            size: "small",
            current: page,
            pageSize: pageSize,
            total: activeList.length,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            style: { padding: "8px 16px", margin: 0 },
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} solicitudes`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Modal de Decisión de Aprobación */}
      <ApprovalDecisionModal
        open={decisionModal.open}
        task={decisionModal.task}
        action={decisionModal.action}
        onClose={() =>
          setDecisionModal({
            open: false,
            task: null,
            action: "APPROVE",
          })
        }
        onSuccess={() => {
          refetchMine();
          refetchAvailable();
        }}
      />

      {/* Drawer para inspeccionar antecedentes de la solicitud */}
      <Drawer
        title={
          <Space>
            <FileSearchOutlined style={{ color: "#d97706" }} />
            <span>Antecedentes y Documentos de la Solicitud</span>
          </Space>
        }
        placement="right"
        size={680}
        open={antecedentsDrawer.open}
        onClose={() =>
          setAntecedentsDrawer({
            open: false,
            task: null,
          })
        }
      >
        {loadingVariables ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin description="Cargando antecedentes..." />
          </div>
        ) : (
          <TaskAntecedentsViewer variables={drawerVariables} defaultExpanded />
        )}
      </Drawer>
    </div>
  );
}


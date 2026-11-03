import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import dayjs from "dayjs";
import { useCallback, useMemo, useState } from "react";
import { useAuthStore } from "../../../stores/auth.store";
import { useDefinitionsQuery } from "../../definitions/hooks/useDefinitionsQueries";
import { useAvailableProcessesQuery } from "../../instances/hooks/useInstancesQueries";
import { getProcessFriendlyName } from "../../instances/utils/instanceFormatters";
import { CompleteTaskModal } from "../components/CompleteTaskModal";
import { TaskDetailDrawer } from "../components/TaskDetailDrawer";
import {
  useAvailableTasksQuery,
  useClaimTaskMutation,
  useMyTasksQuery,
  useUnclaimTaskMutation,
} from "../hooks/useTasksQueries";
import type { WorkflowTask } from "../types/tasks.types";
import { isOperationalTask } from "../utils/taskTypeClassifier";

const { Title, Paragraph, Text } = Typography;

export function TasksPage() {
  const { user } = useAuthStore();
  const isAdmin = Boolean(
    user?.roles?.some((r) =>
      ["workflow-admin", "admin", "realm-admin", "superadmin"].includes(
        r.toLowerCase(),
      ),
    ),
  );

  const [activeTab, setActiveTab] = useState<"mine" | "available">("mine");
  const [minePage, setMinePage] = useState(1);
  const [minePageSize, setMinePageSize] = useState(10);
  const [availablePage, setAvailablePage] = useState(1);
  const [availablePageSize, setAvailablePageSize] = useState(10);

  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // Modals & Drawers
  const [completeModal, setCompleteModal] = useState<{
    open: boolean;
    task: WorkflowTask | null;
  }>({
    open: false,
    task: null,
  });

  const [detailDrawer, setDetailDrawer] = useState<{
    open: boolean;
    taskId: string | null;
    isMyTask?: boolean;
  }>({
    open: false,
    taskId: null,
  });

  // Consultas de catálogo para nombres amigables de procesos
  const { data: availableProcesses } = useAvailableProcessesQuery();
  const { data: definitionsData } = useDefinitionsQuery({ size: 100 });

  // Queries
  const mineParams = {
    start: 0,
    size: 100,
    ...(appliedSearch ? { name: appliedSearch } : {}),
  };

  const availableParams = {
    start: 0,
    size: 100,
    ...(appliedSearch ? { name: appliedSearch } : {}),
  };

  const {
    data: mineData,
    isLoading: loadingMine,
    refetch: refetchMine,
    isFetching: fetchingMine,
  } = useMyTasksQuery(mineParams);

  const {
    data: availableData,
    isLoading: loadingAvailable,
    refetch: refetchAvailable,
    isFetching: fetchingAvailable,
  } = useAvailableTasksQuery(availableParams);

  // Filtrar estrictamente solo tareas operativas (gestión, formularios, asignación)
  const allFilteredMine = useMemo(() => {
    return (mineData?.data ?? []).filter(isOperationalTask);
  }, [mineData?.data]);

  const allFilteredAvailable = useMemo(() => {
    return (availableData?.data ?? []).filter(isOperationalTask);
  }, [availableData?.data]);

  const myCount = allFilteredMine.length;
  const availableCount = allFilteredAvailable.length;

  const paginatedMine = useMemo(() => {
    const start = (minePage - 1) * minePageSize;
    return allFilteredMine.slice(start, start + minePageSize);
  }, [allFilteredMine, minePage, minePageSize]);

  const paginatedAvailable = useMemo(() => {
    const start = (availablePage - 1) * availablePageSize;
    return allFilteredAvailable.slice(start, start + availablePageSize);
  }, [allFilteredAvailable, availablePage, availablePageSize]);

  // Mutations
  const claimMutation = useClaimTaskMutation();
  const unclaimMutation = useUnclaimTaskMutation();

  const handleSearch = () => {
    setMinePage(1);
    setAvailablePage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleResetSearch = () => {
    setSearchInput("");
    setAppliedSearch("");
    setMinePage(1);
    setAvailablePage(1);
  };

  const handleClaim = useCallback(
    async (taskId: string) => {
      try {
        await claimMutation.mutateAsync(taskId);
        message.success("Has tomado la tarea exitosamente");
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
            "Error al reclamar la tarea",
        );
      }
    },
    [claimMutation, refetchMine, refetchAvailable],
  );

  const handleUnclaim = useCallback(
    async (taskId: string) => {
      try {
        await unclaimMutation.mutateAsync(taskId);
        message.success("La tarea ha sido liberada para el equipo");
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
            "Error al liberar la tarea",
        );
      }
    },
    [unclaimMutation, refetchMine, refetchAvailable],
  );

  // Acción directa de resolución (si es admin o responsable, la toma y la completa directamente)
  const handleDirectComplete = useCallback(
    async (task: WorkflowTask) => {
      try {
        if (task.assignee !== user?.id) {
          await claimMutation.mutateAsync(task.id);
          refetchMine();
          refetchAvailable();
        }
        setCompleteModal({
          open: true,
          task,
        });
      } catch (err: unknown) {
        const axErr = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        message.error(
          axErr.response?.data?.message ||
            axErr.message ||
            "Error al iniciar la gestión de la tarea",
        );
      }
    },
    [user, claimMutation, refetchMine, refetchAvailable],
  );

  // Columnas comunes
  const commonColumns: ColumnsType<WorkflowTask> = useMemo(
    () => [
      {
        title: "Actividad / Tarea",
        dataIndex: "name",
        key: "name",
        render: (name: string, record) => (
          <div>
            <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
              {name || "Actividad sin nombre"}
            </Text>
            {record.description && (
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 1 }}
                style={{ margin: 0, fontSize: 12 }}
              >
                {record.description}
              </Paragraph>
            )}
          </div>
        ),
      },
      {
        title: "Trámite / Proceso",
        dataIndex: "processDefinitionId",
        key: "processDefinitionId",
        render: (defId: string) => {
          const friendlyName = getProcessFriendlyName(
            defId,
            definitionsData?.data,
            availableProcesses,
          );
          return (
            <Space>
              <Tag color="cyan" style={{ fontSize: 12, padding: "2px 8px" }}>
                <ApartmentOutlined style={{ marginRight: 4 }} />
                {friendlyName}
              </Tag>
            </Space>
          );
        },
      },
      {
        title: "Prioridad",
        dataIndex: "priority",
        key: "priority",
        width: 110,
        render: (priority: number) => {
          if (priority >= 75) return <Tag color="error">Urgente</Tag>;
          if (priority >= 50) return <Tag color="warning">Media</Tag>;
          return <Tag color="default">Normal</Tag>;
        },
      },
      {
        title: "Asignada el",
        dataIndex: "createTime",
        key: "createTime",
        width: 170,
        render: (date: string) => (
          <Space size="small">
            <ClockCircleOutlined style={{ color: "#94a3b8" }} />
            <Text type="secondary" style={{ fontSize: 13 }}>
              {date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "—"}
            </Text>
          </Space>
        ),
      },
    ],
    [definitionsData, availableProcesses],
  );

  // Columnas para mis tareas
  const mineColumns: ColumnsType<WorkflowTask> = useMemo(
    () => [
      ...commonColumns,
      {
        title: "Acciones",
        key: "actions",
        width: 240,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
              icon={<CheckCircleOutlined />}
              onClick={() =>
                setCompleteModal({
                  open: true,
                  task: record,
                })
              }
            >
              Completar
            </Button>

            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                setDetailDrawer({
                  open: true,
                  taskId: record.id,
                  isMyTask: true,
                })
              }
            >
              Detalle
            </Button>

            <Popconfirm
              title="¿Liberar tarea?"
              description="La tarea volverá a estar disponible para que otro miembro del equipo la tome."
              okText="Sí, liberar"
              cancelText="No"
              onConfirm={() => handleUnclaim(record.id)}
            >
              <Tooltip title="Liberar para el equipo">
                <Button
                  size="small"
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={unclaimMutation.isPending}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [commonColumns, unclaimMutation.isPending, handleUnclaim],
  );

  // Columnas para tareas disponibles en cola
  const availableColumns: ColumnsType<WorkflowTask> = useMemo(
    () => [
      ...commonColumns,
      ...(isAdmin
        ? [
            {
              title: "Asignado a",
              dataIndex: "assignee",
              key: "assignee",
              width: 170,
              render: (assignee: string | null) =>
                assignee ? (
                  <Tag color="geekblue" icon={<UserOutlined />}>
                    @{assignee}
                  </Tag>
                ) : (
                  <Tag color="default">Sin asignar</Tag>
                ),
            },
          ]
        : []),
      {
        title: "Acciones",
        key: "actions",
        width: isAdmin ? 300 : 200,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            {record.assignee !== user?.id &&
              record.assignee !== user?.username && (
                <Button
                  type="primary"
                  size="small"
                  icon={<UserOutlined />}
                  loading={claimMutation.isPending}
                  onClick={() => handleClaim(record.id)}
                >
                  {record.assignee ? "Reasignarme" : "Tomar Tarea"}
                </Button>
              )}

            {isAdmin && (
              <Button
                type="primary"
                size="small"
                style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                icon={<CheckCircleOutlined />}
                onClick={() => handleDirectComplete(record)}
              >
                Completar
              </Button>
            )}

            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                setDetailDrawer({
                  open: true,
                  taskId: record.id,
                  isMyTask: false,
                })
              }
            >
              Detalle
            </Button>
          </Space>
        ),
      },
    ],
    [
      commonColumns,
      claimMutation.isPending,
      handleClaim,
      isAdmin,
      handleDirectComplete,
      user?.id,
      user?.username,
    ],
  );

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
          <Title level={2} style={{ margin: 0, display: "flex", alignItems: "center" }}>
            <CheckSquareOutlined style={{ marginRight: 10, color: "#2563eb" }} />
            Bandeja de Tareas y Actividades
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Gestiona las actividades pendientes asignadas a tu usuario o disponibles para tu equipo.
          </Paragraph>
        </div>

        <Space wrap>
          <Button
            icon={
              <ReloadOutlined
                spin={activeTab === "mine" ? fetchingMine : fetchingAvailable}
              />
            }
            onClick={() => {
              if (activeTab === "mine") refetchMine();
              else refetchAvailable();
            }}
          >
            Actualizar
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
                  <UserOutlined style={{ color: "#3b82f6" }} />
                  <Text type="secondary">Mis Tareas Asignadas</Text>
                </Space>
              }
              value={myCount}
              valueStyle={{ fontWeight: 600, color: "#2563eb" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <InboxOutlined style={{ color: "#d97706" }} />
                  <Text type="secondary">Disponibles en el Equipo</Text>
                </Space>
              }
              value={availableCount}
              valueStyle={{ fontWeight: 600, color: "#d97706" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: "#10b981" }} />
                  <Text type="secondary">Usuario en Sesión</Text>
                </Space>
              }
              value={user?.name || user?.username || "Usuario"}
              valueStyle={{ fontSize: 16, fontWeight: 600, color: "#1e293b" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Barra de Búsqueda */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          background: "#ffffff",
        }}
      >
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap size="middle">
            <Input
              placeholder="Buscar por nombre de tarea..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 300 }}
              allowClear
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            />
            <Button type="primary" onClick={handleSearch}>
              Buscar
            </Button>
            {appliedSearch && (
              <Button onClick={handleResetSearch}>Limpiar filtro</Button>
            )}
          </Space>

          <Text type="secondary" style={{ fontSize: 13 }}>
            Tareas encontradas:{" "}
            <Text strong>{activeTab === "mine" ? myCount : availableCount}</Text>
          </Text>
        </Space>
      </Card>

      {/* Pestañas: Mis Tareas vs Tareas Disponibles */}
      <Card
        styles={{ body: { padding: "16px 20px 0 20px" } }}
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          overflow: "hidden",
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as "mine" | "available")}
          items={[
            {
              key: "mine",
              label: (
                <Space>
                  <UserOutlined />
                  <span>Mis Tareas</span>
                  <Badge
                    count={myCount}
                    overflowCount={99}
                    style={{ backgroundColor: "#2563eb" }}
                  />
                </Space>
              ),
              children: (
                <Table<WorkflowTask>
                  rowKey="id"
                  columns={mineColumns}
                  dataSource={paginatedMine}
                  loading={loadingMine}
                  scroll={{ x: 860 }}
                  style={{ marginBottom: 16 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          appliedSearch
                            ? "No se encontraron tareas con el criterio de búsqueda."
                            : "¡Todo al día! No tienes actividades pendientes asignadas."
                        }
                      />
                    ),
                  }}
                  pagination={{
                    current: minePage,
                    pageSize: minePageSize,
                    total: myCount,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50"],
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} tareas`,
                  }}
                  onChange={(p: TablePaginationConfig) => {
                    if (p.current) setMinePage(p.current);
                    if (p.pageSize) setMinePageSize(p.pageSize);
                  }}
                />
              ),
            },
            {
              key: "available",
              label: (
                <Space>
                  <InboxOutlined />
                  <span>{isAdmin ? "Todas las Tareas en Curso" : "Disponibles para Reclamar"}</span>
                  <Badge
                    count={availableCount}
                    overflowCount={99}
                    style={{ backgroundColor: "#d97706" }}
                  />
                </Space>
              ),
              children: (
                <Table<WorkflowTask>
                  rowKey="id"
                  columns={availableColumns}
                  dataSource={paginatedAvailable}
                  loading={loadingAvailable}
                  scroll={{ x: 800 }}
                  style={{ marginBottom: 16 }}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No hay actividades disponibles para reclamar en este momento."
                      />
                    ),
                  }}
                  pagination={{
                    current: availablePage,
                    pageSize: availablePageSize,
                    total: availableCount,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50"],
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} tareas`,
                  }}
                  onChange={(p: TablePaginationConfig) => {
                    if (p.current) setAvailablePage(p.current);
                    if (p.pageSize) setAvailablePageSize(p.pageSize);
                  }}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* Modal para completar tarea */}
      <CompleteTaskModal
        open={completeModal.open}
        task={completeModal.task}
        onClose={() =>
          setCompleteModal({
            open: false,
            task: null,
          })
        }
        onSuccess={() => {
          refetchMine();
          refetchAvailable();
        }}
      />

      {/* Drawer de detalle */}
      <TaskDetailDrawer
        open={detailDrawer.open}
        taskId={detailDrawer.taskId}
        isMyTask={detailDrawer.isMyTask}
        onClose={() =>
          setDetailDrawer({
            open: false,
            taskId: null,
          })
        }
        onComplete={(taskId: string) => {
          setDetailDrawer({ open: false, taskId: null });
          const found =
            mineData?.data.find((t) => t.id === taskId) ||
            availableData?.data.find((t) => t.id === taskId) ||
            null;
          if (found) {
            setCompleteModal({ open: true, task: found });
          }
        }}
      />
    </div>
  );
}

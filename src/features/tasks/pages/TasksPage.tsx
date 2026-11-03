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

const { Title, Paragraph, Text } = Typography;

export function TasksPage() {
  const { user } = useAuthStore();
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
    start: (minePage - 1) * minePageSize,
    size: minePageSize,
    ...(appliedSearch ? { name: appliedSearch } : {}),
  };

  const availableParams = {
    start: (availablePage - 1) * availablePageSize,
    size: availablePageSize,
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
        message.success("Tarea tomada para tu gestión. Ahora está en 'Mis Tareas'");
        refetchMine();
        refetchAvailable();
        setActiveTab("mine");
      } catch (err: unknown) {
        const axErr = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        message.error(
          axErr.response?.data?.message ||
            axErr.message ||
            "Error al tomar la tarea",
        );
      }
    },
    [claimMutation, refetchMine, refetchAvailable],
  );

  const handleUnclaim = useCallback(
    async (taskId: string) => {
      try {
        await unclaimMutation.mutateAsync(taskId);
        message.success("Tarea liberada. Ahora está disponible para el equipo");
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

  // Columnas amigables para el usuario final (SIN IDs técnicos en pantalla)
  const commonColumns: ColumnsType<WorkflowTask> = useMemo(
    () => [
      {
        title: "Actividad / Tarea",
        dataIndex: "name",
        key: "name",
        render: (name: string, record) => (
          <Space direction="vertical" size={2}>
            <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
              {name || "Actividad pendiente"}
            </Text>
            {record.description && (
              <Paragraph
                type="secondary"
                ellipsis={{ rows: 1 }}
                style={{ margin: 0, fontSize: 12, color: "#64748b" }}
              >
                {record.description}
              </Paragraph>
            )}
          </Space>
        ),
      },
      {
        title: "Trámite / Proceso Relacionado",
        dataIndex: "processDefinitionId",
        key: "processDefinitionId",
        render: (defId: string | null) => {
          const friendlyName = getProcessFriendlyName(
            defId,
            definitionsData?.data,
            availableProcesses,
          );
          return (
            <Space size="small">
              <ApartmentOutlined style={{ color: "#3b82f6" }} />
              <Text strong style={{ fontSize: 13, color: "#334155" }}>
                {friendlyName}
              </Text>
            </Space>
          );
        },
      },
      {
        title: "Prioridad",
        dataIndex: "priority",
        key: "priority",
        width: 120,
        render: (priority: number) => {
          if (priority > 50) return <Tag color="red">Alta</Tag>;
          if (priority === 50) return <Tag color="blue">Normal</Tag>;
          return <Tag color="default">Baja</Tag>;
        },
      },
      {
        title: "Fecha de Asignación",
        dataIndex: "createTime",
        key: "createTime",
        width: 180,
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

  const availableColumns: ColumnsType<WorkflowTask> = useMemo(
    () => [
      ...commonColumns,
      {
        title: "Acciones",
        key: "actions",
        width: 200,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<UserOutlined />}
              loading={claimMutation.isPending}
              onClick={() => handleClaim(record.id)}
            >
              Tomar Tarea
            </Button>

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
    [commonColumns, claimMutation.isPending, handleClaim],
  );

  const myCount = mineData?.total ?? 0;
  const availableCount = availableData?.total ?? 0;

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
            Tareas encontradas: <Text strong>{activeTab === "mine" ? myCount : availableCount}</Text>
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
                  dataSource={mineData?.data ?? []}
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
                  <span>Disponibles para Reclamar</span>
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
                  dataSource={availableData?.data ?? []}
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
                      `${range[0]}-${range[1]} de ${total} disponibles`,
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
        onClose={() => setCompleteModal({ open: false, task: null })}
        onSuccess={() => {
          refetchMine();
          refetchAvailable();
        }}
      />

      {/* Drawer de detalle de tarea */}
      <TaskDetailDrawer
        open={detailDrawer.open}
        taskId={detailDrawer.taskId}
        isMyTask={detailDrawer.isMyTask}
        onClose={() => setDetailDrawer({ open: false, taskId: null })}
        onClaim={(tId) => handleClaim(tId)}
        onUnclaim={(tId) => handleUnclaim(tId)}
        onComplete={(tId) => {
          const t = mineData?.data?.find((item) => item.id === tId) ?? null;
          setCompleteModal({ open: true, task: t });
        }}
      />
    </div>
  );
}

import {
  CheckCircleOutlined,
  CheckSquareOutlined,
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
  Input,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import dayjs from "dayjs";
import { useState } from "react";
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

  const handleClaim = async (taskId: string) => {
    try {
      await claimMutation.mutateAsync(taskId);
      message.success("Tarea reclamada con éxito. Ahora está en 'Mis Tareas'");
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
  };

  const handleUnclaim = async (taskId: string) => {
    try {
      await unclaimMutation.mutateAsync(taskId);
      message.success("Tarea liberada. Ahora está disponible para el equipo");
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
  };

  const commonColumns: ColumnsType<WorkflowTask> = [
    {
      title: "Tarea",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {name || record.taskDefinitionKey || record.id}
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
          <div style={{ fontSize: 11, color: "#64748b" }}>ID: {record.id}</div>
        </div>
      ),
    },
    {
      title: "Instancia de Proceso",
      dataIndex: "processInstanceId",
      key: "processInstanceId",
      width: 200,
      render: (instanceId: string | null) =>
        instanceId ? (
          <Text type="secondary" copyable={{ text: instanceId }}>
            {instanceId}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Prioridad",
      dataIndex: "priority",
      key: "priority",
      width: 110,
      render: (priority: number) => {
        if (priority > 50) return <Tag color="red">Alta</Tag>;
        if (priority === 50) return <Tag color="orange">Normal</Tag>;
        return <Tag color="blue">Baja</Tag>;
      },
    },
    {
      title: "Fecha de Creación",
      dataIndex: "createTime",
      key: "createTime",
      width: 170,
      render: (date: string) => (
        <Text style={{ fontSize: 13 }}>
          {dayjs(date).format("DD/MM/YYYY HH:mm")}
        </Text>
      ),
    },
  ];

  const mineColumns: ColumnsType<WorkflowTask> = [
    ...commonColumns,
    {
      title: "Acciones",
      key: "actions",
      width: 220,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            style={{ background: "#10b981", borderColor: "#10b981" }}
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

          <Popconfirm
            title="¿Liberar tarea?"
            description="La tarea volverá a la cola de pendientes disponibles."
            okText="Sí, liberar"
            cancelText="No"
            onConfirm={() => handleUnclaim(record.id)}
          >
            <Tooltip title="Liberar tarea">
              <Button
                size="small"
                icon={<CloseCircleOutlined />}
                loading={unclaimMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>

          <Tooltip title="Ver detalle">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                setDetailDrawer({
                  open: true,
                  taskId: record.id,
                  isMyTask: true,
                })
              }
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const availableColumns: ColumnsType<WorkflowTask> = [
    ...commonColumns,
    {
      title: "Acciones",
      key: "actions",
      width: 180,
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
            Reclamar
          </Button>

          <Tooltip title="Ver detalle">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                setDetailDrawer({
                  open: true,
                  taskId: record.id,
                  isMyTask: false,
                })
              }
            />
          </Tooltip>
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
            <CheckSquareOutlined style={{ marginRight: 8, color: "#3b82f6" }} />
            Bandeja de Tareas BPMN
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Gestiona las actividades pendientes asignadas a tu usuario o disponibles para tu grupo.
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

      {/* Barra de Búsqueda */}
      <Card size="small">
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Input
              placeholder="Buscar por nombre de tarea..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 280 }}
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
        </Space>
      </Card>

      {/* Pestañas: Mis Tareas vs Tareas Disponibles */}
      <Card styles={{ body: { padding: "16px 24px" } }}>
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
                    count={mineData?.total ?? 0}
                    overflowCount={99}
                    className="fm-nav-badge fm-nav-badge--blue"
                  />
                </Space>
              ),
              children: (
                <Table<WorkflowTask>
                  rowKey="id"
                  columns={mineColumns}
                  dataSource={mineData?.data ?? []}
                  loading={loadingMine}
                  scroll={{ x: 800 }}
                  pagination={{
                    current: minePage,
                    pageSize: minePageSize,
                    total: mineData?.total ?? 0,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50"],
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} tareas asignadas`,
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
                    count={availableData?.total ?? 0}
                    overflowCount={99}
                    className="fm-nav-badge fm-nav-badge--amber"
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
                  pagination={{
                    current: availablePage,
                    pageSize: availablePageSize,
                    total: availableData?.total ?? 0,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50"],
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} tareas disponibles`,
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
        onClose={() =>
          setDetailDrawer({ open: false, taskId: null })
        }
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

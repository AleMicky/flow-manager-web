import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  InboxOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Input,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
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
import {
  ApprovalDecisionModal,
  type ApprovalActionType,
} from "../components/ApprovalDecisionModal";

const { Title, Paragraph, Text } = Typography;

export function ApprovalsPage() {
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

  // Consultas
  const { data: availableProcesses } = useAvailableProcessesQuery();
  const { data: definitionsData } = useDefinitionsQuery({ size: 100 });

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

  const claimMutation = useClaimTaskMutation();

  // Variables y antecedentes de la tarea seleccionada en el drawer
  const { data: drawerVariables, isLoading: loadingVariables } =
    useTaskVariablesQuery(
      antecedentsDrawer.task?.id,
      antecedentsDrawer.open && Boolean(antecedentsDrawer.task?.id),
    );

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
    async (task: WorkflowTask) => {
      try {
        await claimMutation.mutateAsync(task.id);
        message.success(`Solicitud "${task.name}" tomada para tu revisión`);
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
            "Error al tomar la solicitud para evaluación",
        );
      }
    },
    [claimMutation, refetchMine, refetchAvailable],
  );

  const openDecisionModal = (task: WorkflowTask, action: ApprovalActionType) => {
    setDecisionModal({
      open: true,
      task,
      action,
    });
  };

  // Acción directa para aprobar/rechazar/observar
  const handleDirectDecision = useCallback(
    async (task: WorkflowTask, action: ApprovalActionType) => {
      try {
        if (task.assignee !== user?.id) {
          await claimMutation.mutateAsync(task.id);
          refetchMine();
          refetchAvailable();
        }
        setDecisionModal({
          open: true,
          task,
          action,
        });
      } catch (err: unknown) {
        const axErr = err as {
          response?: { data?: { message?: string } };
          message?: string;
        };
        message.error(
          axErr.response?.data?.message ||
            axErr.message ||
            "Error al preparar la aprobación",
        );
      }
    },
    [user, claimMutation, refetchMine, refetchAvailable],
  );

  const openAntecedents = (task: WorkflowTask) => {
    setAntecedentsDrawer({
      open: true,
      task,
    });
  };

  // Contadores
  const myPendingCount = mineData?.total ?? 0;
  const availablePendingCount = availableData?.total ?? 0;

  // Columnas para tareas asignadas al usuario
  const mineColumns: ColumnsType<WorkflowTask> = useMemo(
    () => [
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
            <Space direction="vertical" size={2}>
              <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
                {friendlyName}
              </Text>
            </Space>
          );
        },
      },
      {
        title: "Paso de Aprobación",
        dataIndex: "name",
        key: "name",
        render: (name: string) => (
          <Space>
            <Tag color="geekblue" style={{ fontSize: 13, padding: "2px 8px" }}>
              <ApartmentOutlined style={{ marginRight: 6 }} />
              {name || "Revisión y Aprobación"}
            </Tag>
          </Space>
        ),
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
      {
        title: "Estado de Decisión",
        key: "decisionStatus",
        width: 170,
        render: () => (
          <Tag color="gold" icon={<ExclamationCircleOutlined />} style={{ fontSize: 12 }}>
            Esperando tu visto bueno
          </Tag>
        ),
      },
      {
        title: "Acciones Ejecutivas",
        key: "actions",
        width: 320,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Tooltip title="Ver documentos y antecedentes de la solicitud">
              <Button
                size="small"
                icon={<FileSearchOutlined />}
                onClick={() => openAntecedents(record)}
              >
                Antecedentes
              </Button>
            </Tooltip>

            <Tooltip title="Aprobar solicitud y avanzar trámite">
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                onClick={() => openDecisionModal(record, "APPROVE")}
              >
                Aprobar
              </Button>
            </Tooltip>

            <Tooltip title="Rechazar solicitud con motivo justificado">
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => openDecisionModal(record, "REJECT")}
              >
                Rechazar
              </Button>
            </Tooltip>

            <Tooltip title="Devolver con observaciones para corrección">
              <Button
                size="small"
                style={{ color: "#d97706", borderColor: "#d97706" }}
                onClick={() => openDecisionModal(record, "OBSERVE")}
              >
                Observar
              </Button>
            </Tooltip>
          </Space>
        ),
      },
    ],
    [definitionsData, availableProcesses],
  );

  // Columnas para tareas disponibles en comités o grupos
  const availableColumns: ColumnsType<WorkflowTask> = useMemo(
    () => [
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
            <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
              {friendlyName}
            </Text>
          );
        },
      },
      {
        title: "Paso de Aprobación",
        dataIndex: "name",
        key: "name",
        render: (name: string) => (
          <Tag color="cyan" style={{ fontSize: 13, padding: "2px 8px" }}>
            <ApartmentOutlined style={{ marginRight: 6 }} />
            {name || "Revisión y Aprobación"}
          </Tag>
        ),
      },
      {
        title: "Fecha de Creación",
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
      {
        title: "Estado",
        key: "status",
        width: 180,
        render: () => (
          <Tag color="blue" icon={<InboxOutlined />} style={{ fontSize: 12 }}>
            Disponible para evaluar
          </Tag>
        ),
      },
      {
        title: "Acciones",
        key: "actions",
        width: isAdmin ? 360 : 260,
        fixed: "right",
        render: (_, record) => (
          <Space size="small">
            <Button
              size="small"
              icon={<FileSearchOutlined />}
              onClick={() => openAntecedents(record)}
            >
              Antecedentes
            </Button>

            {isAdmin && (
              <>
                <Tooltip title="Aprobar solicitud">
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                    onClick={() => handleDirectDecision(record, "APPROVE")}
                  >
                    Aprobar
                  </Button>
                </Tooltip>

                <Tooltip title="Rechazar solicitud">
                  <Button
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => handleDirectDecision(record, "REJECT")}
                  >
                    Rechazar
                  </Button>
                </Tooltip>
              </>
            )}

            <Button
              type={isAdmin ? "default" : "primary"}
              size="small"
              icon={<ThunderboltOutlined />}
              loading={claimMutation.isPending}
              onClick={() => handleClaim(record)}
            >
              Tomar para Evaluar
            </Button>
          </Space>
        ),
      },
    ],
    [definitionsData, availableProcesses, claimMutation.isPending, handleClaim, isAdmin, handleDirectDecision],
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
            <FileDoneOutlined style={{ marginRight: 10, color: "#d97706" }} />
            Bandeja de Aprobaciones y Vistos Buenos
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Toma de decisiones ejecutivas sobre solicitudes que requieren tu revisión conforme.
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

      {/* Tarjetas KPI de Estado */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <ClockCircleOutlined style={{ color: "#d97706" }} />
                  <Text type="secondary">Pendientes de Mi Aprobación</Text>
                </Space>
              }
              value={myPendingCount}
              valueStyle={{ fontWeight: 600, color: "#d97706" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <InboxOutlined style={{ color: "#3b82f6" }} />
                  <Text type="secondary">Disponibles para Evaluar</Text>
                </Space>
              }
              value={availablePendingCount}
              valueStyle={{ fontWeight: 600, color: "#3b82f6" }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 8, borderColor: "#e2e8f0" }}>
            <Statistic
              title={
                <Space>
                  <CheckCircleOutlined style={{ color: "#10b981" }} />
                  <Text type="secondary">Revisor en Sesión</Text>
                </Space>
              }
              value={user?.name || user?.username || "Usuario"}
              valueStyle={{ fontSize: 16, fontWeight: 600, color: "#1e293b" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Barra de Búsqueda y Filtros */}
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
              placeholder="Buscar por nombre de paso o trámite..."
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
              <Button onClick={handleResetSearch}>Limpiar búsqueda</Button>
            )}
          </Space>

          <Text type="secondary" style={{ fontSize: 13 }}>
            Total pendientes en bandeja:{" "}
            <Text strong>
              {activeTab === "mine" ? myPendingCount : availablePendingCount}
            </Text>
          </Text>
        </Space>
      </Card>

      {/* Pestañas y Tablas de Aprobación */}
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
          onChange={(key) => setActiveTab(key as "mine" | "available")}
          items={[
            {
              key: "mine",
              label: (
                <Space>
                  <span>Pendientes de Mi Aprobación</span>
                  <Badge
                    count={myPendingCount}
                    overflowCount={99}
                    style={{ backgroundColor: "#d97706" }}
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
                        description="¡Excelente! No tienes solicitudes pendientes de tu visto bueno en este momento."
                      />
                    ),
                  }}
                  pagination={{
                    current: minePage,
                    pageSize: minePageSize,
                    total: myPendingCount,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50"],
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} pendientes`,
                    onChange: (p, ps) => {
                      setMinePage(p);
                      setMinePageSize(ps);
                    },
                  }}
                />
              ),
            },
            {
              key: "available",
              label: (
                <Space>
                  <span>Disponibles para Evaluar</span>
                  <Badge
                    count={availablePendingCount}
                    overflowCount={99}
                    style={{ backgroundColor: "#3b82f6" }}
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
                        description="No hay solicitudes grupales esperando revisor en este momento."
                      />
                    ),
                  }}
                  pagination={{
                    current: availablePage,
                    pageSize: availablePageSize,
                    total: availablePendingCount,
                    showSizeChanger: true,
                    pageSizeOptions: ["10", "20", "50"],
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} de ${total} disponibles`,
                    onChange: (p, ps) => {
                      setAvailablePage(p);
                      setAvailablePageSize(ps);
                    },
                  }}
                />
              ),
            },
          ]}
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

import {
  ApartmentOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { useDefinitionsQuery } from "../definitions/hooks/useDefinitionsQueries";
import { StartProcessModal } from "../instances/components/StartProcessModal";
import {
  useAvailableProcessesQuery,
  useInstancesQuery,
} from "../instances/hooks/useInstancesQueries";
import type { ProcessInstance } from "../instances/types/instances.types";
import {
  formatActivityName,
  getProcessFriendlyName,
} from "../instances/utils/instanceFormatters";
import {
  useAvailableTasksQuery,
  useMyTasksQuery,
} from "../tasks/hooks/useTasksQueries";
import type { WorkflowTask } from "../tasks/types/tasks.types";
import {
  isApprovalTask,
  isOperationalTask,
} from "../tasks/utils/taskTypeClassifier";

const { Title, Text, Paragraph } = Typography;

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [startModalOpen, setStartModalOpen] = useState(false);

  const isAdmin = user?.roles?.some((r) =>
    ["workflow-admin", "admin", "realm-admin", "superadmin"].includes(
      r.toLowerCase(),
    ),
  );

  // Queries con límite optimizado para vista de resumen
  const { data: instancesData, isLoading: loadingInstances } = useInstancesQuery({
    size: 5,
    ...(isAdmin ? {} : { startedBy: user?.username }),
  });

  const { data: myTasksData, isLoading: loadingMyTasks } = useMyTasksQuery({
    size: 50,
  });

  const { data: availableTasksData } = useAvailableTasksQuery({
    size: 50,
  });

  const { data: definitionsData } = useDefinitionsQuery({
    size: 1,
  });

  const { data: availableProcesses } = useAvailableProcessesQuery();

  const totalInstances = instancesData?.total ?? 0;
  const operationalTasks = useMemo(
    () => (myTasksData?.data || []).filter(isOperationalTask),
    [myTasksData?.data],
  );
  const approvalTasks = useMemo(() => {
    return (myTasksData?.data || []).filter(isApprovalTask);
  }, [myTasksData?.data]);

  const totalMyTasks = operationalTasks.length;
  const totalAvailableTasks = approvalTasks.length;
  const totalProcesses = definitionsData?.total ?? 0;

  const todayStr = useMemo(
    () =>
      new Intl.DateTimeFormat("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  // Columnas para Tareas Prioritarias
  const taskColumns: ColumnsType<WorkflowTask> = [
    {
      title: "Actividad / Tarea",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => {
        const friendlyProcess = getProcessFriendlyName(
          record.processDefinitionId,
          definitionsData?.data,
          availableProcesses,
        );
        const { label } = formatActivityName(name);
        return (
          <div>
            <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
              {label}
            </Text>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Flujo: <span style={{ fontWeight: 500 }}>{friendlyProcess}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: "Prioridad",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority: number) => {
        if (priority >= 75) return <Tag color="error">Urgente</Tag>;
        if (priority >= 50) return <Tag color="warning">Media</Tag>;
        return <Tag color="default">Normal</Tag>;
      },
    },
    {
      title: "Acción",
      key: "action",
      width: 90,
      align: "center",
      render: () => (
        <Button
          type="primary"
          size="small"
          ghost
          onClick={() => navigate("/tareas")}
        >
          Atender
        </Button>
      ),
    },
  ];

  // Columnas para Solicitudes Recientes
  const instanceColumns: ColumnsType<ProcessInstance> = [
    {
      title: "Código",
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: string) => {
        const code = id ? `SOL-${id.slice(-4).toUpperCase()}` : "SOL-0000";
        return (
          <Tag color="geekblue" style={{ fontFamily: "monospace", fontWeight: 600 }}>
            {code}
          </Tag>
        );
      },
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
          <Text strong style={{ fontSize: 13 }}>
            {friendlyName}
          </Text>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "ended",
      key: "ended",
      width: 120,
      render: (ended: boolean, record) => {
        if (ended) return <Tag color="default">Finalizado</Tag>;
        if (record.suspended) return <Tag color="error">Suspendido</Tag>;
        return <Badge status="processing" text={<span style={{ color: "#0284c7" }}>En curso</span>} />;
      },
    },
  ];

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", paddingBottom: 32 }}>
      {/* Banner Principal de Bienvenida */}
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 24,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#fff",
          border: "none",
        }}
      >
        <Row align="middle" justify="space-between" gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Space orientation="vertical" size={6}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Title level={2} style={{ color: "#fff", margin: 0 }}>
                  ¡Hola, {user?.name || user?.username || "Usuario"}! 👋
                </Title>
                {isAdmin ? (
                  <Tag color="gold" icon={<SafetyCertificateOutlined />}>
                    Modo Administrador
                  </Tag>
                ) : (
                  <Tag color="cyan" icon={<UserOutlined />}>
                    Operador / Solicitante
                  </Tag>
                )}
              </div>
              <Paragraph style={{ color: "#94a3b8", margin: 0, textTransform: "capitalize", fontSize: 14 }}>
                {todayStr}
              </Paragraph>
              <Paragraph style={{ color: "#cbd5e1", margin: 0, fontSize: 13 }}>
                Bienvenido al Centro de Gestión de Procesos y Aprobaciones. Aquí puedes dar seguimiento a tus
                solicitudes, gestionar trámites asignados y autorizar operaciones.
              </Paragraph>
            </Space>
          </Col>

          <Col xs={24} md={8} style={{ textAlign: "right" }}>
            <Space wrap>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={() => setStartModalOpen(true)}
                style={{
                  backgroundColor: "#4f46e5",
                  borderColor: "#4f46e5",
                  boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
                  fontWeight: 500,
                }}
              >
                Nueva Solicitud
              </Button>
              <Button
                size="large"
                ghost
                icon={<CheckCircleOutlined />}
                onClick={() => navigate("/aprobaciones")}
              >
                Aprobaciones
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tarjetas KPI de Estado */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <Card
            hoverable
            onClick={() => navigate("/solicitudes")}
            style={{ borderRadius: 10, cursor: "pointer", borderLeft: "4px solid #3b82f6" }}
          >
            <Statistic
              title={isAdmin ? "Total Solicitudes del Sistema" : "Mis Solicitudes Activas"}
              value={totalInstances}
              prefix={<FileTextOutlined style={{ color: "#3b82f6" }} />}
              suffix={<ArrowRightOutlined style={{ fontSize: 12, color: "#94a3b8" }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card
            hoverable
            onClick={() => navigate("/tareas")}
            style={{ borderRadius: 10, cursor: "pointer", borderLeft: "4px solid #f59e0b" }}
          >
            <Statistic
              title="Mis Tareas Operativas"
              value={totalMyTasks}
              prefix={<ClockCircleOutlined style={{ color: "#f59e0b" }} />}
              suffix={<ArrowRightOutlined style={{ fontSize: 12, color: "#94a3b8" }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card
            hoverable
            onClick={() => navigate("/aprobaciones")}
            style={{ borderRadius: 10, cursor: "pointer", borderLeft: "4px solid #10b981" }}
          >
            <Statistic
              title="Aprobaciones y VoBos"
              value={totalAvailableTasks}
              prefix={<CheckSquareOutlined style={{ color: "#10b981" }} />}
              suffix={<ArrowRightOutlined style={{ fontSize: 12, color: "#94a3b8" }} />}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} xl={6}>
          <Card
            hoverable
            onClick={() => navigate("/procesos")}
            style={{ borderRadius: 10, cursor: "pointer", borderLeft: "4px solid #8b5cf6" }}
          >
            <Statistic
              title="Catálogo de Procesos"
              value={totalProcesses}
              prefix={<ApartmentOutlined style={{ color: "#8b5cf6" }} />}
              suffix={<ArrowRightOutlined style={{ fontSize: 12, color: "#94a3b8" }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Tablas de Tareas y Solicitudes Recientes */}
      <Row gutter={[24, 24]}>
        {/* Tareas Prioritarias */}
        <Col xs={24} lg={13}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Space>
                  <ClockCircleOutlined style={{ color: "#f59e0b" }} />
                  <span>Mis Tareas por Atender</span>
                </Space>
                {totalMyTasks > 0 && (
                  <Button type="link" size="small" onClick={() => navigate("/tareas")}>
                    Ver todas ({totalMyTasks})
                  </Button>
                )}
              </div>
            }
            style={{ borderRadius: 10, height: "100%" }}
          >
            {totalMyTasks === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="¡Estás al día! No tienes tareas pendientes asignadas."
              >
                <Button type="dashed" onClick={() => navigate("/aprobaciones")}>
                  Revisar trámites en espera de evaluación
                </Button>
              </Empty>
            ) : (
              <Table
                dataSource={operationalTasks}
                columns={taskColumns}
                rowKey="id"
                pagination={false}
                loading={loadingMyTasks}
                size="middle"
              />
            )}
          </Card>
        </Col>

        {/* Últimas Solicitudes Registradas */}
        <Col xs={24} lg={11}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Space>
                  <FileTextOutlined style={{ color: "#3b82f6" }} />
                  <span>{isAdmin ? "Últimas Solicitudes Globales" : "Mis Solicitudes Recientes"}</span>
                </Space>
                {totalInstances > 0 && (
                  <Button type="link" size="small" onClick={() => navigate("/solicitudes")}>
                    Ver todas ({totalInstances})
                  </Button>
                )}
              </div>
            }
            style={{ borderRadius: 10, height: "100%" }}
          >
            {totalInstances === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No registras solicitudes activas actualmente."
              >
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setStartModalOpen(true)}
                >
                  Iniciar mi primera solicitud
                </Button>
              </Empty>
            ) : (
              <Table
                dataSource={instancesData?.data || []}
                columns={instanceColumns}
                rowKey="id"
                pagination={false}
                loading={loadingInstances}
                size="middle"
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* Modal para iniciar solicitud directamente desde el Dashboard */}
      <StartProcessModal
        open={startModalOpen}
        onClose={() => setStartModalOpen(false)}
      />
    </div>
  );
}

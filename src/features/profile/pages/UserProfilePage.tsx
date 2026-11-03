import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  IdcardOutlined,
  KeyOutlined,
  LogoutOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../stores/auth.store";
import { useInstancesQuery } from "../../instances";
import { useMyTasksQuery } from "../../tasks";

const { Title, Paragraph, Text } = Typography;

export function UserProfilePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.roles?.some((r) =>
    ["workflow-admin", "admin", "realm-admin", "superadmin"].includes(
      r.toLowerCase(),
    ),
  );

  const { data: myInstancesData } = useInstancesQuery({
    startedBy: user?.username,
    size: 1,
  });

  const { data: myTasksData } = useMyTasksQuery({ size: 1 });

  const displayName = user?.name || user?.username || "Usuario";
  const userInitials = (user?.name || user?.username || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 32 }}>
      {/* Encabezado del Perfil */}
      <Card
        style={{
          borderRadius: 12,
          marginBottom: 24,
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#fff",
          border: "none",
        }}
      >
        <Row align="middle" gutter={[24, 24]}>
          <Col xs={24} sm="auto">
            <Avatar
              size={88}
              style={{
                backgroundColor: "#4f46e5",
                fontSize: 32,
                fontWeight: 600,
                border: "3px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {userInitials || <UserOutlined />}
            </Avatar>
          </Col>
          <Col xs={24} sm="auto" flex="1">
            <Space orientation="vertical" size={4} style={{ display: "flex" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <Title level={2} style={{ color: "#fff", margin: 0 }}>
                  {displayName}
                </Title>
                <Badge
                  status="success"
                  text={<span style={{ color: "#34d399", fontWeight: 500 }}>Sesión Activa</span>}
                />
              </div>

              <Paragraph style={{ color: "#94a3b8", margin: 0, fontSize: 14 }}>
                @{user?.username || "usuario"} · {user?.email || "Sin correo asociado"}
              </Paragraph>

              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {isAdmin ? (
                  <Tag color="gold" icon={<SafetyCertificateOutlined />}>
                    Administrador del Sistema
                  </Tag>
                ) : (
                  <Tag color="cyan" icon={<UserOutlined />}>
                    Operador / Solicitante
                  </Tag>
                )}
                <Tag color="blue">SSO Keycloak Autenticado</Tag>
              </div>
            </Space>
          </Col>
          <Col xs={24} sm="auto">
            <Popconfirm
              title="¿Desea cerrar su sesión actual?"
              okText="Cerrar sesión"
              cancelText="Cancelar"
              onConfirm={() => logout()}
            >
              <Button danger icon={<LogoutOutlined />} ghost>
                Cerrar Sesión
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      </Card>

      {/* Métricas rápidas de la cuenta */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card
            hoverable
            onClick={() => navigate("/solicitudes")}
            style={{ borderRadius: 10, cursor: "pointer" }}
          >
            <Statistic
              title="Mis Solicitudes Registradas"
              value={myInstancesData?.total ?? 0}
              prefix={<FileTextOutlined style={{ color: "#3b82f6" }} />}
              suffix="trámites"
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            hoverable
            onClick={() => navigate("/tareas")}
            style={{ borderRadius: 10, cursor: "pointer" }}
          >
            <Statistic
              title="Tareas Asignadas Pendientes"
              value={myTasksData?.total ?? 0}
              prefix={<ClockCircleOutlined style={{ color: "#f59e0b" }} />}
              suffix="por atender"
            />
          </Card>
        </Col>

        <Col xs={24} sm={8}>
          <Card
            hoverable
            onClick={() => navigate("/aprobaciones")}
            style={{ borderRadius: 10, cursor: "pointer" }}
          >
            <Statistic
              title="Bandeja de Aprobaciones"
              value={myTasksData?.total ?? 0}
              prefix={<CheckCircleOutlined style={{ color: "#10b981" }} />}
              suffix="disponibles"
            />
          </Card>
        </Col>
      </Row>

      {/* Información detallada de identidad */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <IdcardOutlined style={{ color: "#6366f1" }} />
                <span>Datos del Funcionario / Usuario</span>
              </Space>
            }
            style={{ borderRadius: 10 }}
          >
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="middle">
              <Descriptions.Item label="Nombre Completo">
                <Text strong>{user?.name || "Sin especificar"}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Nombre de Usuario">
                <Text code>{user?.username}</Text>
              </Descriptions.Item>

              <Descriptions.Item label="Correo Corporativo">
                <Space>
                  <MailOutlined style={{ color: "#64748b" }} />
                  <Text>{user?.email || "No registrado"}</Text>
                </Space>
              </Descriptions.Item>

              <Descriptions.Item label="Nivel de Privilegios">
                {isAdmin ? (
                  <Tag color="volcano">Acceso Administrativo Completo</Tag>
                ) : (
                  <Tag color="blue">Usuario Estándar de Trámites</Tag>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Autenticación">
                <Badge status="processing" text="OpenID Connect / OAuth2 Keycloak" />
              </Descriptions.Item>

              <Descriptions.Item label="Estado de Cuenta">
                <Tag color="success">Habilitado en Directorio</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider titlePlacement="start" plain style={{ marginTop: 24, marginBottom: 16 }}>
              Roles y Membresías de Grupo Asignadas
            </Divider>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {user?.roles && user.roles.length > 0 ? (
                user.roles.map((role) => (
                  <Tag
                    key={role}
                    color="purple"
                    icon={<SafetyCertificateOutlined />}
                    style={{ padding: "4px 10px", fontSize: 13 }}
                  >
                    {role}
                  </Tag>
                ))
              ) : (
                <Text type="secondary">No registra roles explícitos en el token de sesión</Text>
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <KeyOutlined style={{ color: "#6366f1" }} />
                <span>Seguridad y Sesión</span>
              </Space>
            }
            style={{ borderRadius: 10 }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Su sesión está respaldada por el servidor central de identidad Keycloak. La gestión
              de contraseñas y factores de autenticación se administra en el portal corporativo.
            </Paragraph>

            <div style={{ background: "#f8fafc", padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                Identificador de Usuario (Sub / ID):
              </Text>
              <Text copyable code style={{ fontSize: 11, wordBreak: "break-all" }}>
                {user?.id || "N/A"}
              </Text>
            </div>

            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              <Button
                block
                type="primary"
                ghost
                onClick={() => navigate("/solicitudes")}
              >
                Ver mis solicitudes
              </Button>
              <Button
                block
                onClick={() => navigate("/tareas")}
              >
                Ir a mi bandeja de tareas
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

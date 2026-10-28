import {
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  useKeycloakUserDetailQuery,
  useKeycloakUserGroupsQuery,
  useKeycloakUserRolesQuery,
} from "../hooks/useKeycloakAdminQueries";

const { Text, Title } = Typography;

interface UserDetailDrawerProps {
  open: boolean;
  userId: string | null;
  onClose: () => void;
}

export function UserDetailDrawer({
  open,
  userId,
  onClose,
}: UserDetailDrawerProps) {
  const isEnabled = open && Boolean(userId);

  const {
    data: user,
    isLoading: loadingUser,
    isError: errorUser,
  } = useKeycloakUserDetailQuery(userId ?? undefined, isEnabled);

  const { data: rolesData, isLoading: loadingRoles } =
    useKeycloakUserRolesQuery(userId ?? undefined, isEnabled);

  const { data: groupsData, isLoading: loadingGroups } =
    useKeycloakUserGroupsQuery(userId ?? undefined, isEnabled);

  const isLoading = loadingUser || loadingRoles || loadingGroups;

  return (
    <Drawer
      title={
        <Space>
          <UserOutlined style={{ color: "#3b82f6" }} />
          <span>Detalle de Usuario Keycloak</span>
          {user && <Tag color="blue">{user.username}</Tag>}
        </Space>
      }
      placement="right"
      size={580}
      open={open}
      onClose={onClose}
    >
      {isLoading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin description="Cargando información del usuario..." />
        </div>
      )}

      {errorUser && !isLoading && (
        <Empty description="No se pudo obtener la información del usuario." />
      )}

      {!isLoading && user && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Descriptions
            bordered
            size="small"
            column={1}
            title={user.fullName || user.username}
          >
            <Descriptions.Item label="ID (Candidate User BPMN)">
              <Text copyable>{user.id}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Username">
              <Text strong copyable>
                {user.username}
              </Text>
            </Descriptions.Item>

            <Descriptions.Item label="Nombre completo">
              {user.fullName || "—"}
            </Descriptions.Item>

            <Descriptions.Item label="Correo electrónico">
              {user.email ? (
                <Space>
                  <Text copyable>{user.email}</Text>
                  {user.emailVerified && (
                    <Tag color="green" icon={<CheckCircleOutlined />}>
                      Verificado
                    </Tag>
                  )}
                </Space>
              ) : (
                <Text type="secondary">Sin correo</Text>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Estado">
              {user.enabled ? (
                <Badge status="success" text="Activo" />
              ) : (
                <Badge status="default" text="Inactivo" />
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: "4px 0" }} />

          {/* Roles asignados */}
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              <SafetyCertificateOutlined
                style={{ marginRight: 8, color: "#3b82f6" }}
              />
              Roles Asignados (Candidate Groups BPMN)
            </Title>

            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Roles Efectivos">
                {rolesData?.effectiveRoles?.length ? (
                  <Space wrap size={[4, 8]}>
                    {rolesData.effectiveRoles.map((role) => (
                      <Tag color="geekblue" key={role}>
                        <Text copyable={{ text: role }} style={{ color: "inherit" }}>
                          {role}
                        </Text>
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">Sin roles efectivos</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Roles de Cliente">
                {rolesData?.clientRoles?.length ? (
                  <Space wrap size={[4, 8]}>
                    {rolesData.clientRoles.map((role) => (
                      <Tag color="blue" key={role.id}>
                        {role.name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">Ninguno</Text>
                )}
              </Descriptions.Item>

              <Descriptions.Item label="Roles del Realm">
                {rolesData?.realmRoles?.length ? (
                  <Space wrap size={[4, 8]}>
                    {rolesData.realmRoles.map((role) => (
                      <Tag color="purple" key={role.id}>
                        {role.name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">Ninguno</Text>
                )}
              </Descriptions.Item>
            </Descriptions>
          </div>

          <Divider style={{ margin: "4px 0" }} />

          {/* Grupos del usuario */}
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              <TeamOutlined style={{ marginRight: 8, color: "#10b981" }} />
              Grupos a los que pertenece
            </Title>

            {groupsData?.length ? (
              <Space wrap size={[8, 8]}>
                {groupsData.map((group) => (
                  <Tag color="cyan" key={group.id} style={{ padding: "4px 10px" }}>
                    <Text strong>{group.name}</Text>{" "}
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({group.path})
                    </Text>
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">
                El usuario no pertenece a ningún grupo.
              </Text>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}


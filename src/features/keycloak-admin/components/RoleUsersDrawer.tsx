import { SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { Badge, Drawer, Empty, Space, Spin, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useKeycloakUsersByRoleQuery } from "../hooks/useKeycloakAdminQueries";
import type { KeycloakAdminUser } from "../types/keycloak-admin.types";

const { Text } = Typography;

interface RoleUsersDrawerProps {
  open: boolean;
  roleName: string | null;
  onClose: () => void;
  onSelectUser?: (userId: string) => void;
}

export function RoleUsersDrawer({
  open,
  roleName,
  onClose,
  onSelectUser,
}: RoleUsersDrawerProps) {
  const { data, isLoading } = useKeycloakUsersByRoleQuery(
    roleName ?? undefined,
    { first: 0, max: 100 },
    open && Boolean(roleName),
  );

  const columns: ColumnsType<KeycloakAdminUser> = [
    {
      title: "Usuario",
      dataIndex: "fullName",
      key: "fullName",
      render: (fullName: string, record) => (
        <div>
          <Space>
            <UserOutlined style={{ color: "#3b82f6" }} />
            <Text
              strong
              style={{
                cursor: onSelectUser ? "pointer" : "default",
                color: onSelectUser ? "#2563eb" : undefined,
              }}
              onClick={() => onSelectUser?.(record.id)}
            >
              {fullName}
            </Text>
          </Space>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            @{record.username}
          </div>
        </div>
      ),
    },
    {
      title: "Correo",
      dataIndex: "email",
      key: "email",
      render: (email?: string) =>
        email ? <Text>{email}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Estado",
      dataIndex: "enabled",
      key: "enabled",
      width: 100,
      render: (enabled: boolean) =>
        enabled ? (
          <Badge status="success" text="Activo" />
        ) : (
          <Badge status="default" text="Inactivo" />
        ),
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: "#3b82f6" }} />
          <span>Usuarios con el rol</span>
          {roleName && <Tag color="geekblue">{roleName}</Tag>}
        </Space>
      }
      placement="right"
      size={580}
      open={open}
      onClose={onClose}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin description="Consultando usuarios con este rol..." />
        </div>
      ) : data?.length ? (
        <Table<KeycloakAdminUser>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      ) : (
        <Empty description="No hay usuarios asignados directamente a este rol." />
      )}
    </Drawer>
  );
}


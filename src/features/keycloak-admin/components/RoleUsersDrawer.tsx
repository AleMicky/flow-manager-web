import {
  DeleteOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Drawer,
  Empty,
  Popconfirm,
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
import { useState } from "react";
import { getErrorMessage } from "../../common";
import {
  useAssignUserRoleMutation,
  useKeycloakUsersByRoleQuery,
  useKeycloakUsersQuery,
  useRemoveUserRoleMutation,
} from "../hooks/useKeycloakAdminQueries";
import type { KeycloakAdminUser } from "../types/keycloak-admin.types";

const { Text } = Typography;

interface RoleUsersDrawerProps {
  open: boolean;
  roleName: string | null;
  roleSource?: "realm" | "client";
  onClose: () => void;
  onSelectUser?: (userId: string) => void;
}

export function RoleUsersDrawer({
  open,
  roleName,
  roleSource = "realm",
  onClose,
  onSelectUser,
}: RoleUsersDrawerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    undefined,
  );
  const isEnabled = open && Boolean(roleName);

  const { data: roleUsers, isLoading: loadingRoleUsers } =
    useKeycloakUsersByRoleQuery(
      roleName ?? undefined,
      { first: 0, max: 1000 },
      isEnabled,
    );

  const { data: allUsersData, isLoading: loadingAllUsers } =
    useKeycloakUsersQuery(isEnabled ? { first: 0, max: 1000 } : undefined);

  const assignRoleMutation = useAssignUserRoleMutation();
  const removeRoleMutation = useRemoveUserRoleMutation();

  const assignedUserIds = new Set((roleUsers ?? []).map((u) => u.id));
  const availableUsers = (allUsersData?.data ?? []).filter(
    (u) => !assignedUserIds.has(u.id),
  );

  const handleAddUser = async () => {
    if (!roleName || !selectedUserId) return;
    try {
      await assignRoleMutation.mutateAsync({
        userId: selectedUserId,
        payload: {
          roleName,
          source: roleSource,
        },
      });
      setSelectedUserId(undefined);
      message.success(`Usuario asignado al rol "${roleName}" correctamente`);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo asignar el usuario al rol"));
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!roleName) return;
    try {
      await removeRoleMutation.mutateAsync({
        userId,
        roleName,
        source: roleSource,
      });
      message.success(`Usuario quitado del rol "${roleName}"`);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo quitar el usuario del rol"));
    }
  };

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
              {fullName || record.username}
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
      width: 90,
      render: (enabled: boolean) =>
        enabled ? (
          <Badge status="success" text="Activo" />
        ) : (
          <Badge status="default" text="Inactivo" />
        ),
    },
    {
      title: "Acción",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="¿Quitar rol a este usuario?"
          description={`Se desvinculará el rol "${roleName}" de @${record.username}.`}
          okText="Quitar"
          cancelText="Cancelar"
          okButtonProps={{ danger: true }}
          onConfirm={() => handleRemoveUser(record.id)}
        >
          <Tooltip title="Quitar rol del usuario">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={removeRoleMutation.isPending}
            />
          </Tooltip>
        </Popconfirm>
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
          <Tag color={roleSource === "client" ? "blue" : "purple"}>
            {roleSource === "client" ? "Cliente" : "Realm"}
          </Tag>
        </Space>
      }
      placement="right"
      size={620}
      open={open}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Selector para agregar usuario al rol */}
        <Space style={{ width: "100%" }} wrap>
          <Select
            placeholder="Seleccionar usuario para asignar a este rol..."
            value={selectedUserId}
            onChange={setSelectedUserId}
            style={{ width: 340 }}
            allowClear
            showSearch
            loading={loadingAllUsers}
            optionFilterProp="label"
            options={availableUsers.map((u) => ({
              value: u.id,
              label: `${u.fullName || u.username} (@${u.username}${u.email ? ` - ${u.email}` : ""})`,
            }))}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            disabled={!selectedUserId}
            loading={assignRoleMutation.isPending}
            onClick={handleAddUser}
          >
            Asignar a rol
          </Button>
        </Space>

        {loadingRoleUsers ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin description="Consultando usuarios con este rol..." />
          </div>
        ) : roleUsers?.length ? (
          <Table<KeycloakAdminUser>
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={roleUsers}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        ) : (
          <Empty description="No hay usuarios asignados directamente a este rol." />
        )}
      </div>
    </Drawer>
  );
}

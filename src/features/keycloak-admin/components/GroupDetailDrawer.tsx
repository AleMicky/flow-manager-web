import {
  DeleteOutlined,
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Descriptions,
  Divider,
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
import {
  useAssignUserToGroupMutation,
  useKeycloakGroupDetailQuery,
  useKeycloakGroupMembersQuery,
  useKeycloakUsersQuery,
  useRemoveUserFromGroupMutation,
} from "../hooks/useKeycloakAdminQueries";
import type { KeycloakAdminUser } from "../types/keycloak-admin.types";

const { Text, Title } = Typography;

interface GroupDetailDrawerProps {
  open: boolean;
  groupId: string | null;
  onClose: () => void;
  onSelectUser?: (userId: string) => void;
}

export function GroupDetailDrawer({
  open,
  groupId,
  onClose,
  onSelectUser,
}: GroupDetailDrawerProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    undefined,
  );
  const isEnabled = open && Boolean(groupId);

  const { data: group, isLoading: loadingGroup } = useKeycloakGroupDetailQuery(
    groupId ?? undefined,
    isEnabled,
  );

  const { data: members, isLoading: loadingMembers } =
    useKeycloakGroupMembersQuery(
      groupId ?? undefined,
      { first: 0, max: 100 },
      isEnabled,
    );

  const { data: allUsersData } = useKeycloakUsersQuery(
    isEnabled ? { first: 0, max: 100 } : undefined,
  );

  const assignMutation = useAssignUserToGroupMutation();
  const removeMutation = useRemoveUserFromGroupMutation();

  const memberIds = new Set((members ?? []).map((m) => m.id));
  const availableUsers = (allUsersData?.data ?? []).filter(
    (u) => !memberIds.has(u.id),
  );

  const handleAddMember = async () => {
    if (!groupId || !selectedUserId) return;
    try {
      await assignMutation.mutateAsync({
        userId: selectedUserId,
        groupId,
      });
      setSelectedUserId(undefined);
      message.success("Usuario agregado al grupo");
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "Error al agregar el usuario al grupo",
      );
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    try {
      await removeMutation.mutateAsync({ userId, groupId });
      message.success("Usuario removido del grupo");
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "Error al quitar el usuario del grupo",
      );
    }
  };

  const columns: ColumnsType<KeycloakAdminUser> = [
    {
      title: "Miembro",
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
          title="¿Quitar usuario del grupo?"
          okText="Quitar"
          cancelText="Cancelar"
          onConfirm={() => handleRemoveMember(record.id)}
        >
          <Tooltip title="Quitar del grupo">
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={removeMutation.isPending}
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
          <TeamOutlined style={{ color: "#10b981" }} />
          <span>Detalle de Grupo</span>
          {group && <Tag color="cyan">{group.name}</Tag>}
        </Space>
      }
      placement="right"
      size={580}
      open={open}
      onClose={onClose}
    >
      {loadingGroup ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin description="Cargando información del grupo..." />
        </div>
      ) : group ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Descriptions bordered size="small" column={1} title={group.name}>
            <Descriptions.Item label="ID de Grupo">
              <Text copyable>{group.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Nombre">
              <Text strong copyable>
                {group.name}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ruta (Path)">
              <Tag color="geekblue">
                <Text copyable style={{ color: "inherit" }}>
                  {group.path}
                </Text>
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Subgrupos">
              {group.subGroups?.length ? (
                <Space wrap>
                  {group.subGroups.map((sub) => (
                    <Tag key={sub.id}>{sub.name}</Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">
                  {group.subGroupCount ? `${group.subGroupCount}` : "Ninguno"}
                </Text>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: "4px 0" }} />

          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              <UserOutlined style={{ marginRight: 8, color: "#3b82f6" }} />
              Miembros del Grupo ({members?.length ?? 0})
            </Title>

            <Space style={{ width: "100%", marginBottom: 12 }} wrap>
              <Select
                placeholder="Seleccionar usuario para agregar..."
                value={selectedUserId}
                onChange={setSelectedUserId}
                style={{ width: 320 }}
                allowClear
                showSearch
                optionFilterProp="label"
                options={availableUsers.map((u) => ({
                  value: u.id,
                  label: `${u.fullName} (@${u.username})`,
                }))}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!selectedUserId}
                loading={assignMutation.isPending}
                onClick={handleAddMember}
              >
                Agregar miembro
              </Button>
            </Space>

            {loadingMembers ? (
              <Spin />
            ) : members?.length ? (
              <Table<KeycloakAdminUser>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={members}
                pagination={{ pageSize: 10, showSizeChanger: false }}
              />
            ) : (
              <Empty description="Este grupo no tiene miembros registrados." />
            )}
          </div>
        </div>
      ) : (
        <Empty description="No se encontró el grupo solicitado." />
      )}
    </Drawer>
  );
}

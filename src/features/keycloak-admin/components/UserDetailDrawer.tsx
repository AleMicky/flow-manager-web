import {
  CheckCircleOutlined,
  DeleteOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
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
  Tag,
  Typography,
  message,
} from "antd";
import { useState } from "react";
import {
  useAssignUserToGroupMutation,
  useKeycloakGroupsQuery,
  useKeycloakUserDetailQuery,
  useKeycloakUserGroupsQuery,
  useKeycloakUserRolesQuery,
  useRemoveUserFromGroupMutation,
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    undefined,
  );
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

  const { data: allGroups } = useKeycloakGroupsQuery(
    { first: 0, max: 100 },
    isEnabled,
  );

  const assignGroupMutation = useAssignUserToGroupMutation();
  const removeGroupMutation = useRemoveUserFromGroupMutation();

  const isLoading = loadingUser || loadingRoles || loadingGroups;

  const assignedGroupIds = new Set((groupsData ?? []).map((g) => g.id));
  const availableGroups = (allGroups ?? []).filter(
    (g) => !assignedGroupIds.has(g.id),
  );

  const handleAssignGroup = async () => {
    if (!userId || !selectedGroupId) return;
    try {
      await assignGroupMutation.mutateAsync({
        userId,
        groupId: selectedGroupId,
      });
      setSelectedGroupId(undefined);
      message.success("Usuario asignado al grupo correctamente");
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "No se pudo asignar el usuario al grupo",
      );
    }
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (!userId) return;
    try {
      await removeGroupMutation.mutateAsync({ userId, groupId });
      message.success("Usuario removido del grupo");
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "No se pudo quitar el usuario del grupo",
      );
    }
  };

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

          {/* Grupos del usuario (Asignar / Quitar) */}
          <div>
            <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              <TeamOutlined style={{ marginRight: 8, color: "#10b981" }} />
              Grupos del Usuario
            </Title>

            <Space style={{ width: "100%", marginBottom: 12 }} wrap>
              <Select
                placeholder="Seleccionar grupo para asignar..."
                value={selectedGroupId}
                onChange={setSelectedGroupId}
                style={{ width: 320 }}
                allowClear
                showSearch
                optionFilterProp="label"
                options={availableGroups.map((g) => ({
                  value: g.id,
                  label: `${g.name} (${g.path})`,
                }))}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!selectedGroupId}
                loading={assignGroupMutation.isPending}
                onClick={handleAssignGroup}
              >
                Asignar a grupo
              </Button>
            </Space>

            {groupsData?.length ? (
              <Space wrap size={[8, 8]}>
                {groupsData.map((group) => (
                  <Tag
                    color="cyan"
                    key={group.id}
                    style={{
                      padding: "4px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>
                      <Text strong>{group.name}</Text>{" "}
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        ({group.path})
                      </Text>
                    </span>
                    <Popconfirm
                      title="¿Quitar usuario de este grupo?"
                      okText="Sí, quitar"
                      cancelText="No"
                      onConfirm={() => handleRemoveGroup(group.id)}
                    >
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        loading={removeGroupMutation.isPending}
                        style={{ padding: 0, height: 18, width: 18 }}
                      />
                    </Popconfirm>
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">
                El usuario no pertenece a ningún grupo actualmente.
              </Text>
            )}
          </div>

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
                        <Text
                          copyable={{ text: role }}
                          style={{ color: "inherit" }}
                        >
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
        </div>
      )}
    </Drawer>
  );
}

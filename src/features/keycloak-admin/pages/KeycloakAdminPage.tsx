import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  StopOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Radio,
  Row,
  Select,
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
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getErrorMessage } from "../../common";
import { GroupDetailDrawer } from "../components/GroupDetailDrawer";
import { GroupFormModal } from "../components/GroupFormModal";
import { RoleFormModal, type RoleFormData } from "../components/RoleFormModal";
import { RoleUsersDrawer } from "../components/RoleUsersDrawer";
import { UserDetailDrawer } from "../components/UserDetailDrawer";
import {
  useDeleteKeycloakGroupMutation,
  useDeleteKeycloakRoleMutation,
  useKeycloakCandidateRolesQuery,
  useKeycloakClientRolesQuery,
  useKeycloakGroupsQuery,
  useKeycloakRealmRolesQuery,
  useKeycloakUsersQuery,
} from "../hooks/useKeycloakAdminQueries";
import type {
  KeycloakAdminUser,
  KeycloakCandidateRole,
  KeycloakGroupRepresentation,
  KeycloakRoleRepresentation,
} from "../types/keycloak-admin.types";

const { Title, Paragraph, Text } = Typography;

type ActiveTab = "users" | "groups" | "roles";
type RoleScope = "candidates" | "client" | "realm";

interface UnifiedRoleRow {
  id: string;
  name: string;
  description?: string;
  source: "client" | "realm";
  clientId?: string;
}

export function KeycloakAdminPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as ActiveTab | null;

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (tabParam && ["users", "groups", "roles"].includes(tabParam)) {
      return tabParam;
    }
    return "users";
  });

  useEffect(() => {
    if (
      tabParam &&
      ["users", "groups", "roles"].includes(tabParam) &&
      tabParam !== activeTab
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (k: string) => {
    const nextTab = k as ActiveTab;
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab });
  };

  // Filtros y paginación: Usuarios
  const [userSearchInput, setUserSearchInput] = useState("");
  const [appliedUserSearch, setAppliedUserSearch] = useState("");
  const [userEnabledFilter, setUserEnabledFilter] = useState<
    "all" | "true" | "false"
  >("all");
  const [userPage, setUserPage] = useState(1);
  const [userPageSize, setUserPageSize] = useState(10);

  // Filtros: Roles
  const [roleScope, setRoleScope] = useState<RoleScope>("candidates");
  const [roleSearchInput, setRoleSearchInput] = useState("");
  const [appliedRoleSearch, setAppliedRoleSearch] = useState("");

  // Filtros: Grupos
  const [groupSearchInput, setGroupSearchInput] = useState("");
  const [appliedGroupSearch, setAppliedGroupSearch] = useState("");

  // Drawers
  const [userDrawerId, setUserDrawerId] = useState<string | null>(null);
  const [roleDrawer, setRoleDrawer] = useState<{
    name: string;
    source: "realm" | "client";
  } | null>(null);
  const [groupDrawerId, setGroupDrawerId] = useState<string | null>(null);

  // Modal Crear / Editar Grupo
  const [groupModal, setGroupModal] = useState<{
    open: boolean;
    group: KeycloakGroupRepresentation | null;
  }>({ open: false, group: null });

  // Modal Crear / Editar Rol
  const [roleModal, setRoleModal] = useState<{
    open: boolean;
    role: RoleFormData | null;
  }>({ open: false, role: null });

  // Mutation Eliminar Grupo y Rol
  const deleteGroupMutation = useDeleteKeycloakGroupMutation();
  const deleteRoleMutation = useDeleteKeycloakRoleMutation();

  // Queries: Usuarios
  const usersQuery = useKeycloakUsersQuery({
    first: (userPage - 1) * userPageSize,
    max: userPageSize,
    ...(appliedUserSearch ? { search: appliedUserSearch } : {}),
    ...(userEnabledFilter !== "all"
      ? { enabled: userEnabledFilter === "true" }
      : {}),
  });

  // Queries: Roles
  const roleParams = {
    first: 0,
    max: 100,
    ...(appliedRoleSearch ? { search: appliedRoleSearch } : {}),
  };

  const candidateRolesQuery = useKeycloakCandidateRolesQuery(
    roleParams,
    activeTab === "roles" && roleScope === "candidates",
  );

  const clientRolesQuery = useKeycloakClientRolesQuery(
    roleParams,
    activeTab === "roles" && roleScope === "client",
  );

  const realmRolesQuery = useKeycloakRealmRolesQuery(
    roleParams,
    activeTab === "roles" && roleScope === "realm",
  );

  // Queries: Grupos
  const groupsQuery = useKeycloakGroupsQuery(
    {
      first: 0,
      max: 100,
      ...(appliedGroupSearch ? { search: appliedGroupSearch } : {}),
    },
    activeTab === "groups",
  );

  const handleRefresh = () => {
    if (activeTab === "users") {
      void usersQuery.refetch();
    } else if (activeTab === "roles") {
      if (roleScope === "candidates") void candidateRolesQuery.refetch();
      if (roleScope === "client") void clientRolesQuery.refetch();
      if (roleScope === "realm") void realmRolesQuery.refetch();
    } else {
      void groupsQuery.refetch();
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      await deleteGroupMutation.mutateAsync(id);
      message.success("Grupo eliminado de Keycloak exitosamente");
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo eliminar el grupo"));
    }
  };

  const handleDeleteRole = async (
    roleName: string,
    source: "realm" | "client",
  ) => {
    try {
      await deleteRoleMutation.mutateAsync({ roleName, source });
      message.success(`Rol "${roleName}" eliminado de Keycloak exitosamente`);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo eliminar el rol"));
    }
  };

  const isFetchingCurrent =
    activeTab === "users"
      ? usersQuery.isFetching
      : activeTab === "roles"
        ? candidateRolesQuery.isFetching ||
          clientRolesQuery.isFetching ||
          realmRolesQuery.isFetching
        : groupsQuery.isFetching;

  const roleRows: UnifiedRoleRow[] = (() => {
    if (roleScope === "candidates") {
      return (candidateRolesQuery.data ?? []).map(
        (r: KeycloakCandidateRole) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          source: r.source,
          clientId: r.clientId,
        }),
      );
    }
    if (roleScope === "client") {
      return (clientRolesQuery.data ?? []).map(
        (r: KeycloakRoleRepresentation) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          source: "client" as const,
        }),
      );
    }
    return (realmRolesQuery.data ?? []).map(
      (r: KeycloakRoleRepresentation) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        source: "realm" as const,
      }),
    );
  })();

  const loadingRoles =
    roleScope === "candidates"
      ? candidateRolesQuery.isLoading
      : roleScope === "client"
        ? clientRolesQuery.isLoading
        : realmRolesQuery.isLoading;

  const getInitials = (name?: string, username?: string) => {
    const str = (name || username || "U").trim();
    const parts = str.split(" ");
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  // Columnas: Usuarios
  const userColumns: ColumnsType<KeycloakAdminUser> = [
    {
      title: "Usuario",
      dataIndex: "fullName",
      key: "fullName",
      render: (fullName: string, record) => (
        <Space align="center" size="middle">
          <Avatar
            style={{
              backgroundColor: record.enabled ? "#eff6ff" : "#f1f5f9",
              color: record.enabled ? "#2563eb" : "#94a3b8",
              border: `1px solid ${record.enabled ? "#bfdbfe" : "#cbd5e1"}`,
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {getInitials(fullName, record.username)}
          </Avatar>
          <div>
            <Space>
              <Text strong style={{ fontSize: 14 }}>
                {fullName || record.username}
              </Text>
              <Tag color="blue">@{record.username}</Tag>
            </Space>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              UUID BPMN:{" "}
              <Text
                copyable
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  fontFamily: "monospace",
                }}
              >
                {record.id}
              </Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Correo Electrónico",
      dataIndex: "email",
      key: "email",
      render: (email: string | undefined, record) =>
        email ? (
          <Space size="small">
            <Text copyable>{email}</Text>
            {record.emailVerified && (
              <Tooltip title="Correo verificado">
                <CheckCircleOutlined style={{ color: "#10b981" }} />
              </Tooltip>
            )}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Estado",
      dataIndex: "enabled",
      key: "enabled",
      width: 120,
      render: (enabled: boolean) =>
        enabled ? (
          <Tag
            icon={<CheckCircleOutlined />}
            color="success"
            style={{ borderRadius: 10 }}
          >
            Activo
          </Tag>
        ) : (
          <Tag
            icon={<StopOutlined />}
            color="default"
            style={{ borderRadius: 10 }}
          >
            Inactivo
          </Tag>
        ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 180,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          icon={<TeamOutlined />}
          onClick={() => setUserDrawerId(record.id)}
        >
          Asignar Grupos
        </Button>
      ),
    },
  ];

  // Columnas: Roles
  const roleColumns: ColumnsType<UnifiedRoleRow> = [
    {
      title: "Rol (Candidate Group BPMN)",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <Space>
          <SafetyCertificateOutlined style={{ color: "#3b82f6" }} />
          <Tag color="geekblue" style={{ fontSize: 13, padding: "2px 8px" }}>
            <Text copyable={{ text: name }} strong style={{ color: "inherit" }}>
              {name}
            </Text>
          </Tag>
        </Space>
      ),
    },
    {
      title: "Origen",
      dataIndex: "source",
      key: "source",
      width: 180,
      render: (source: "client" | "realm", record) =>
        source === "client" ? (
          <Tag color="blue">
            Cliente{record.clientId ? ` (${record.clientId})` : ""}
          </Tag>
        ) : (
          <Tag color="purple">Realm</Tag>
        ),
    },
    {
      title: "Descripción",
      dataIndex: "description",
      key: "description",
      render: (description?: string) =>
        description ? (
          <Text>{description}</Text>
        ) : (
          <Text type="secondary">Sin descripción</Text>
        ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 230,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() =>
              setRoleDrawer({ name: record.name, source: record.source })
            }
          >
            Usuarios
          </Button>

          <Tooltip title="Editar rol">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() =>
                setRoleModal({
                  open: true,
                  role: {
                    id: record.id,
                    name: record.name,
                    description: record.description,
                    source: record.source,
                  },
                })
              }
            />
          </Tooltip>

          <Popconfirm
            title="¿Eliminar este rol?"
            description={`Se eliminará el rol "${record.name}" en Keycloak.`}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteRole(record.name, record.source)}
          >
            <Tooltip title="Eliminar rol">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteRoleMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Columnas: Grupos
  const groupColumns: ColumnsType<KeycloakGroupRepresentation> = [
    {
      title: "Grupo",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <Space>
            <TeamOutlined style={{ color: "#10b981" }} />
            <Text strong>{name}</Text>
          </Space>
          <div style={{ fontSize: 11, color: "#64748b" }}>
            ID:{" "}
            <Text copyable style={{ fontSize: 11, color: "#64748b" }}>
              {record.id}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Ruta (Path)",
      dataIndex: "path",
      key: "path",
      render: (path: string) => (
        <Tag color="cyan">
          <Text copyable style={{ color: "inherit" }}>
            {path}
          </Text>
        </Tag>
      ),
    },
    {
      title: "Subgrupos",
      key: "subGroups",
      width: 140,
      render: (_, record) => {
        const count =
          record.subGroupCount ?? record.subGroups?.length ?? 0;
        return count > 0 ? (
          <Badge count={count} style={{ backgroundColor: "#3b82f6" }} />
        ) : (
          <Text type="secondary">0</Text>
        );
      },
    },
    {
      title: "Acciones",
      key: "actions",
      width: 230,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setGroupDrawerId(record.id)}
          >
            Miembros
          </Button>

          <Tooltip title="Editar grupo">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => setGroupModal({ open: true, group: record })}
            />
          </Tooltip>

          <Popconfirm
            title="¿Eliminar este grupo?"
            description={`Se eliminará el grupo "${record.name}" en Keycloak.`}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDeleteGroup(record.id)}
          >
            <Tooltip title="Eliminar grupo">
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                loading={deleteGroupMutation.isPending}
              />
            </Tooltip>
          </Popconfirm>
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
            <SafetyCertificateOutlined
              style={{ marginRight: 8, color: "#3b82f6" }}
            />
            Directorio Keycloak (Usuarios, Roles y Grupos)
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Consulta usuarios, gestiona grupos organizacionales y administra los roles de aplicación de Keycloak.
          </Paragraph>
        </div>

        <Space wrap>
          {activeTab === "roles" && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setRoleModal({ open: true, role: null })}
            >
              Nuevo Rol
            </Button>
          )}
          {activeTab === "groups" && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setGroupModal({ open: true, group: null })}
            >
              Nuevo Grupo
            </Button>
          )}
          <Button
            icon={<ReloadOutlined spin={isFetchingCurrent} />}
            onClick={handleRefresh}
          >
            Actualizar
          </Button>
          <Button
            icon={<SettingOutlined />}
            onClick={() => navigate("/configuracion")}
          >
            Configuración de Flujos
          </Button>
        </Space>
      </div>

      {/* Tarjetas Resumen / KPIs de Identidad */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total Usuarios</span>}
              value={usersQuery.data?.total ?? 0}
              prefix={<UserOutlined style={{ color: "#3b82f6" }} />}
              valueStyle={{ fontSize: 20, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Grupos Organizacionales</span>}
              value={groupsQuery.data?.length ?? 0}
              prefix={<TeamOutlined style={{ color: "#10b981" }} />}
              valueStyle={{ fontSize: 20, fontWeight: 600, color: "#10b981" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Roles Candidatos BPMN</span>}
              value={candidateRolesQuery.data?.length ?? 0}
              prefix={<SafetyCertificateOutlined style={{ color: "#8b5cf6" }} />}
              valueStyle={{ fontSize: 20, fontWeight: 600, color: "#8b5cf6" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" styles={{ body: { padding: "12px 16px" } }}>
            <div
              style={{
                color: "rgba(0, 0, 0, 0.45)",
                fontSize: 12,
                marginBottom: 4,
              }}
            >
              Asignación a Procesos
            </div>
            <div style={{ marginTop: 4 }}>
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: "auto", fontSize: 13 }}
                icon={<SettingOutlined />}
                onClick={() => navigate("/configuracion")}
              >
                Mapear tareas BPMN →
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {usersQuery.isError && (
        <Alert
          type="error"
          showIcon
          message="Error al conectar con Keycloak Admin REST API"
          description={getErrorMessage(
            usersQuery.error,
            "Verifica que el servicio de Keycloak esté en línea o que las credenciales de administración sean válidas.",
          )}
          action={
            <Button size="small" danger onClick={() => handleRefresh()}>
              Reintentar
            </Button>
          }
        />
      )}

      {/* Pestañas principales */}
      <Card styles={{ body: { padding: "16px 24px" } }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: "users",
              label: (
                <Space>
                  <UserOutlined />
                  <span>Usuarios</span>
                  <Badge
                    count={usersQuery.data?.total ?? 0}
                    overflowCount={999}
                    className="fm-nav-badge fm-nav-badge--blue"
                  />
                </Space>
              ),
              children: (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <Space wrap>
                    <Input
                      placeholder="Buscar por nombre, usuario o correo..."
                      value={userSearchInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserSearchInput(val);
                        if (!val.trim()) {
                          setAppliedUserSearch("");
                          setUserPage(1);
                        }
                      }}
                      onPressEnter={() => {
                        setUserPage(1);
                        setAppliedUserSearch(userSearchInput.trim());
                      }}
                      style={{ width: 300 }}
                      allowClear
                      prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                    />
                    <Select
                      value={userEnabledFilter}
                      onChange={(val) => {
                        setUserPage(1);
                        setUserEnabledFilter(val);
                      }}
                      style={{ width: 150 }}
                      options={[
                        { value: "all", label: "Todos los estados" },
                        { value: "true", label: "Solo activos" },
                        { value: "false", label: "Solo inactivos" },
                      ]}
                    />
                    <Button
                      type="primary"
                      onClick={() => {
                        setUserPage(1);
                        setAppliedUserSearch(userSearchInput.trim());
                      }}
                    >
                      Buscar
                    </Button>
                    {(appliedUserSearch || userEnabledFilter !== "all") && (
                      <Button
                        onClick={() => {
                          setUserSearchInput("");
                          setAppliedUserSearch("");
                          setUserEnabledFilter("all");
                          setUserPage(1);
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </Space>

                  <Table<KeycloakAdminUser>
                    rowKey="id"
                    columns={userColumns}
                    dataSource={usersQuery.data?.data ?? []}
                    loading={usersQuery.isLoading}
                    scroll={{ x: 760 }}
                    locale={{
                      emptyText:
                        appliedUserSearch || userEnabledFilter !== "all" ? (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No se encontraron usuarios que coincidan con los filtros aplicados"
                          >
                            <Button
                              size="small"
                              onClick={() => {
                                setUserSearchInput("");
                                setAppliedUserSearch("");
                                setUserEnabledFilter("all");
                                setUserPage(1);
                              }}
                            >
                              Limpiar filtros
                            </Button>
                          </Empty>
                        ) : (
                          <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No hay usuarios registrados en el realm de Keycloak"
                          />
                        ),
                    }}
                    pagination={{
                      current: userPage,
                      pageSize: userPageSize,
                      total: usersQuery.data?.total ?? 0,
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "20", "50"],
                      showTotal: (total, range) =>
                        `${range[0]}-${range[1]} de ${total} usuarios`,
                    }}
                    onChange={(p: TablePaginationConfig) => {
                      if (p.current) setUserPage(p.current);
                      if (p.pageSize) setUserPageSize(p.pageSize);
                    }}
                  />
                </div>
              ),
            },
            {
              key: "roles",
              label: (
                <Space>
                  <SafetyCertificateOutlined />
                  <span>Roles / Candidatos BPMN</span>
                </Space>
              ),
              children: (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <Space
                    wrap
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                  >
                    <Radio.Group
                      value={roleScope}
                      onChange={(e) => setRoleScope(e.target.value)}
                      optionType="button"
                      buttonStyle="solid"
                      options={[
                        {
                          label: "Candidatos BPMN (Cliente + Realm)",
                          value: "candidates",
                        },
                        { label: "Roles de Cliente", value: "client" },
                        { label: "Roles de Realm", value: "realm" },
                      ]}
                    />

                    <Space wrap>
                      <Input
                        placeholder="Filtrar roles por nombre..."
                        value={roleSearchInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRoleSearchInput(val);
                          if (!val.trim()) {
                            setAppliedRoleSearch("");
                          }
                        }}
                        onPressEnter={() =>
                          setAppliedRoleSearch(roleSearchInput.trim())
                        }
                        style={{ width: 240 }}
                        allowClear
                        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                      />
                      <Button
                        type="primary"
                        onClick={() =>
                          setAppliedRoleSearch(roleSearchInput.trim())
                        }
                      >
                        Filtrar
                      </Button>
                      {appliedRoleSearch && (
                        <Button
                          onClick={() => {
                            setRoleSearchInput("");
                            setAppliedRoleSearch("");
                          }}
                        >
                          Limpiar
                        </Button>
                      )}
                    </Space>
                  </Space>

                  <Table<UnifiedRoleRow>
                    rowKey={(r) => `${r.source}-${r.id}`}
                    columns={roleColumns}
                    dataSource={roleRows}
                    loading={loadingRoles}
                    scroll={{ x: 760 }}
                    locale={{
                      emptyText: appliedRoleSearch ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={`No se encontraron roles que coincidan con "${appliedRoleSearch}"`}
                        >
                          <Button
                            size="small"
                            onClick={() => {
                              setRoleSearchInput("");
                              setAppliedRoleSearch("");
                            }}
                          >
                            Limpiar búsqueda
                          </Button>
                        </Empty>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No se encontraron roles en este ámbito"
                        />
                      ),
                    }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "20", "50"],
                      showTotal: (total) => `${total} roles encontrados`,
                    }}
                  />
                </div>
              ),
            },
            {
              key: "groups",
              label: (
                <Space>
                  <TeamOutlined />
                  <span>Grupos</span>
                </Space>
              ),
              children: (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
                    <Space wrap>
                      <Input
                        placeholder="Buscar grupo por nombre..."
                        value={groupSearchInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setGroupSearchInput(val);
                          if (!val.trim()) {
                            setAppliedGroupSearch("");
                          }
                        }}
                        onPressEnter={() =>
                          setAppliedGroupSearch(groupSearchInput.trim())
                        }
                        style={{ width: 280 }}
                        allowClear
                        prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                      />
                      <Button
                        type="primary"
                        onClick={() =>
                          setAppliedGroupSearch(groupSearchInput.trim())
                        }
                      >
                        Buscar
                      </Button>
                      {appliedGroupSearch && (
                        <Button
                          onClick={() => {
                            setGroupSearchInput("");
                            setAppliedGroupSearch("");
                          }}
                        >
                          Limpiar
                        </Button>
                      )}
                    </Space>
                  </Space>

                  <Table<KeycloakGroupRepresentation>
                    rowKey="id"
                    columns={groupColumns}
                    dataSource={groupsQuery.data ?? []}
                    loading={groupsQuery.isLoading}
                    scroll={{ x: 820 }}
                    locale={{
                      emptyText: appliedGroupSearch ? (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description={`No se encontraron grupos que coincidan con "${appliedGroupSearch}"`}
                        >
                          <Button
                            size="small"
                            onClick={() => {
                              setGroupSearchInput("");
                              setAppliedGroupSearch("");
                            }}
                          >
                            Limpiar búsqueda
                          </Button>
                        </Empty>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="No hay grupos creados en Keycloak"
                        >
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            onClick={() => setGroupModal({ open: true, group: null })}
                          >
                            Crear primer grupo
                          </Button>
                        </Empty>
                      ),
                    }}
                    pagination={{
                      pageSize: 10,
                      showSizeChanger: true,
                      pageSizeOptions: ["10", "20", "50"],
                      showTotal: (total) => `${total} grupos encontrados`,
                    }}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal: Crear / Editar Grupo */}
      <GroupFormModal
        open={groupModal.open}
        group={groupModal.group}
        onClose={() => setGroupModal({ open: false, group: null })}
      />

      {/* Modal: Crear / Editar Rol */}
      <RoleFormModal
        open={roleModal.open}
        role={roleModal.role}
        onClose={() => setRoleModal({ open: false, role: null })}
      />

      {/* Drawer: Detalle de Usuario y Asignar/Quitar Grupos */}
      <UserDetailDrawer
        open={Boolean(userDrawerId)}
        userId={userDrawerId}
        onClose={() => setUserDrawerId(null)}
      />

      {/* Drawer: Usuarios por Rol */}
      <RoleUsersDrawer
        open={Boolean(roleDrawer)}
        roleName={roleDrawer?.name ?? null}
        roleSource={roleDrawer?.source}
        onClose={() => setRoleDrawer(null)}
        onSelectUser={(uid) => {
          setRoleDrawer(null);
          setUserDrawerId(uid);
        }}
      />

      {/* Drawer: Detalle y Miembros de Grupo (Agregar / Quitar Miembros) */}
      <GroupDetailDrawer
        open={Boolean(groupDrawerId)}
        groupId={groupDrawerId}
        onClose={() => setGroupDrawerId(null)}
        onSelectUser={(uid) => {
          setGroupDrawerId(null);
          setUserDrawerId(uid);
        }}
      />
    </div>
  );
}

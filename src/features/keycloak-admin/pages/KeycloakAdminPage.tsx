import {
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useState } from "react";
import { GroupDetailDrawer } from "../components/GroupDetailDrawer";
import { RoleUsersDrawer } from "../components/RoleUsersDrawer";
import { UserDetailDrawer } from "../components/UserDetailDrawer";
import {
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

type ActiveTab = "users" | "roles" | "groups";
type RoleScope = "candidates" | "client" | "realm";

interface UnifiedRoleRow {
  id: string;
  name: string;
  description?: string;
  source: "client" | "realm";
  clientId?: string;
}

export function KeycloakAdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");

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
  const [roleDrawerName, setRoleDrawerName] = useState<string | null>(null);
  const [groupDrawerId, setGroupDrawerId] = useState<string | null>(null);

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

  const isFetchingCurrent =
    activeTab === "users"
      ? usersQuery.isFetching
      : activeTab === "roles"
        ? candidateRolesQuery.isFetching ||
          clientRolesQuery.isFetching ||
          realmRolesQuery.isFetching
        : groupsQuery.isFetching;

  // Normalizar filas de roles según el alcance seleccionado
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

  // Columnas: Usuarios
  const userColumns: ColumnsType<KeycloakAdminUser> = [
    {
      title: "Usuario",
      dataIndex: "fullName",
      key: "fullName",
      render: (fullName: string, record) => (
        <div>
          <Space>
            <UserOutlined style={{ color: "#3b82f6" }} />
            <Text strong style={{ fontSize: 14 }}>
              {fullName}
            </Text>
            <Tag color="blue">@{record.username}</Tag>
          </Space>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
            UUID BPMN:{" "}
            <Text copyable style={{ fontSize: 11, color: "#64748b" }}>
              {record.id}
            </Text>
          </div>
        </div>
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
          <Badge status="success" text="Activo" />
        ) : (
          <Badge status="default" text="Inactivo" />
        ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setUserDrawerId(record.id)}
        >
          Roles y Grupos
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
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Button
          size="small"
          icon={<TeamOutlined />}
          onClick={() => setRoleDrawerName(record.name)}
        >
          Ver Usuarios
        </Button>
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
      width: 160,
      fixed: "right",
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setGroupDrawerId(record.id)}
        >
          Ver Miembros
        </Button>
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
            Consulta identidades, roles candidatos (candidateGroups) y grupos
            organizacionales para la asignación de tareas BPMN.
          </Paragraph>
        </div>

        <Button
          icon={<ReloadOutlined spin={isFetchingCurrent} />}
          onClick={handleRefresh}
        >
          Actualizar
        </Button>
      </div>

      {usersQuery.isError && (
        <Alert
          type="error"
          showIcon
          title="Error al conectar con Keycloak Admin REST API"
          description={
            (
              usersQuery.error as {
                response?: { data?: { message?: string } };
                message?: string;
              }
            )?.response?.data?.message ||
            (usersQuery.error instanceof Error
              ? usersQuery.error.message
              : "Verifica que el cliente tenga habilitado 'Service accounts roles' en Keycloak o configura KEYCLOAK_ADMIN_USERNAME / KEYCLOAK_ADMIN_PASSWORD en .env.")
          }
        />
      )}

      {/* Pestañas principales */}
      <Card styles={{ body: { padding: "16px 24px" } }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as ActiveTab)}
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
                      onChange={(e) => setUserSearchInput(e.target.value)}
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
                        onChange={(e) => setRoleSearchInput(e.target.value)}
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
                  <Space wrap>
                    <Input
                      placeholder="Buscar grupo por nombre..."
                      value={groupSearchInput}
                      onChange={(e) => setGroupSearchInput(e.target.value)}
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

                  <Table<KeycloakGroupRepresentation>
                    rowKey="id"
                    columns={groupColumns}
                    dataSource={groupsQuery.data ?? []}
                    loading={groupsQuery.isLoading}
                    scroll={{ x: 760 }}
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

      {/* Drawer: Detalle de Usuario, sus Roles y sus Grupos */}
      <UserDetailDrawer
        open={Boolean(userDrawerId)}
        userId={userDrawerId}
        onClose={() => setUserDrawerId(null)}
      />

      {/* Drawer: Usuarios por Rol */}
      <RoleUsersDrawer
        open={Boolean(roleDrawerName)}
        roleName={roleDrawerName}
        onClose={() => setRoleDrawerName(null)}
        onSelectUser={(uid) => {
          setRoleDrawerName(null);
          setUserDrawerId(uid);
        }}
      />

      {/* Drawer: Detalle y Miembros de Grupo */}
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


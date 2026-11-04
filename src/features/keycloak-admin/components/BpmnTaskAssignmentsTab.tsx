import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQueries } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../../common";
import { BpmnXmlModal, useDefinitionsQuery } from "../../definitions";
import {
  TaskFormConfigModal,
  useProcessFormsQuery,
} from "../../tasks";
import { KEYCLOAK_ADMIN_QUERY_KEYS } from "../constants/keycloak-admin.endpoints";
import {
  useKeycloakCandidateRolesQuery,
  useKeycloakGroupsQuery,
  useKeycloakUsersQuery,
  useProcessTaskAssignmentsQuery,
  useUpsertTaskAssignmentMutation,
} from "../hooks/useKeycloakAdminQueries";
import { keycloakAdminService } from "../services/keycloak-admin.service";
import type { BpmnUserTaskAssignmentView } from "../types/keycloak-admin.types";

const { Text, Paragraph } = Typography;

export interface BpmnTaskAssignmentsTabProps {
  initialProcessKey?: string;
  hideHeaderBanner?: boolean;
  hideProcessSelector?: boolean;
}

type StatusFilterType = "all" | "configured" | "unassigned" | "warnings";

export function BpmnTaskAssignmentsTab({
  initialProcessKey,
  hideProcessSelector = false,
}: BpmnTaskAssignmentsTabProps = {}) {
  const { data: definitionsPage, isLoading: loadingDefs } = useDefinitionsQuery(
    { size: 100 },
  );

  // Deduplicar procesos por key tomando la versión más reciente
  const uniqueProcesses = useMemo(() => {
    const map = new Map<
      string,
      { id: string; key: string; name: string; version: number }
    >();
    for (const def of definitionsPage?.data ?? []) {
      const current = map.get(def.key);
      if (!current || def.version > current.version) {
        map.set(def.key, {
          id: def.id,
          key: def.key,
          name: def.name || def.key,
          version: def.version,
        });
      }
    }
    return Array.from(map.values());
  }, [definitionsPage]);

  const [selectedProcessKey, setSelectedProcessKey] = useState<
    string | undefined
  >(initialProcessKey);

  useEffect(() => {
    if (initialProcessKey) {
      setSelectedProcessKey(initialProcessKey);
    }
  }, [initialProcessKey]);

  const activeProcessKey = selectedProcessKey ?? uniqueProcesses[0]?.key;

  // Definición activa para abrir el modal del diagrama BPMN
  const activeDefinition = useMemo(() => {
    if (!activeProcessKey) return null;
    return uniqueProcesses.find((p) => p.key === activeProcessKey) ?? null;
  }, [uniqueProcesses, activeProcessKey]);

  // Filtros
  const [taskFilter, setTaskFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");

  // Estado para el Modal de BPMN XML / Diagrama
  const [bpmnModalOpen, setBpmnModalOpen] = useState(false);

  // Estado para el Modal de Configuración por Tarea
  const [editingTask, setEditingTask] =
    useState<BpmnUserTaskAssignmentView | null>(null);
  const [modalGroups, setModalGroups] = useState<string[]>([]);
  const [modalUsers, setModalUsers] = useState<string[]>([]);

  // Estado para el Modal de Formulario de Etapa
  const [formConfigTask, setFormConfigTask] = useState<{
    taskDefinitionKey: string;
    taskName: string;
  } | null>(null);

  // Queries de formularios configurados para el proceso actual
  const { data: processForms } = useProcessFormsQuery(
    activeProcessKey,
    Boolean(activeProcessKey),
  );

  const configuredFormsMap = useMemo(() => {
    return new Map((processForms ?? []).map((f) => [f.taskDefinitionKey, f]));
  }, [processForms]);

  // Queries principales
  const {
    data: taskAssignments,
    isLoading: loadingTasks,
    refetch: refetchTasks,
  } = useProcessTaskAssignmentsQuery(
    activeProcessKey,
    Boolean(activeProcessKey),
  );

  const { data: keycloakGroups } = useKeycloakGroupsQuery({
    first: 0,
    max: 100,
  });
  const { data: keycloakRoles } = useKeycloakCandidateRolesQuery({
    first: 0,
    max: 100,
  });
  const {
    data: keycloakUsers,
    isLoading: loadingUsers,
    isError: usersError,
  } = useKeycloakUsersQuery({
    first: 0,
    max: 100,
  });

  const upsertMutation = useUpsertTaskAssignmentMutation();

  // Mapa rápido de usuarios para resolver tanto por ID como por username
  const userMap = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        username: string;
        fullName: string;
        email?: string;
        enabled: boolean;
      }
    >();
    for (const u of keycloakUsers?.data ?? []) {
      const item = {
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.username,
        email: u.email,
        enabled: u.enabled,
      };
      map.set(u.id, item);
      map.set(u.username, item);
    }
    return map;
  }, [keycloakUsers]);

  // Lista única de roles/grupos asignados en el proceso actual
  const uniqueAssignedRoles = useMemo(() => {
    const set = new Set<string>();
    for (const t of taskAssignments ?? []) {
      for (const g of t.candidateGroups) {
        set.add(g);
      }
    }
    return Array.from(set);
  }, [taskAssignments]);

  // Consulta dinámica de usuarios asignados a cada rol presente en las tareas
  const roleQueries = useQueries({
    queries: uniqueAssignedRoles.map((roleName) => ({
      queryKey: KEYCLOAK_ADMIN_QUERY_KEYS.usersByRole(roleName, {
        first: 0,
        max: 1,
      }),
      queryFn: () =>
        keycloakAdminService.getUsersByRole(roleName, { first: 0, max: 1 }),
      staleTime: 60_000,
      retry: false,
      enabled: Boolean(roleName),
    })),
  });

  // Mapa de diagnóstico dinámico de roles
  const roleHealthMap = useMemo(() => {
    const map = new Map<
      string,
      {
        existsInKeycloak: boolean;
        isRole: boolean;
        isGroup: boolean;
        userCount: number;
        isLoading: boolean;
      }
    >();

    const knownRoleNames = new Set((keycloakRoles ?? []).map((r) => r.name));
    const knownGroupNames = new Set((keycloakGroups ?? []).map((g) => g.name));

    uniqueAssignedRoles.forEach((roleName, index) => {
      const isRole = knownRoleNames.has(roleName);
      const isGroup = knownGroupNames.has(roleName);
      const exists = isRole || isGroup;

      const q = roleQueries[index];
      const userCount = q?.data?.length ?? 0;
      const isLoading = q?.isLoading ?? false;

      map.set(roleName, {
        existsInKeycloak: exists,
        isRole,
        isGroup,
        userCount,
        isLoading,
      });
    });

    return map;
  }, [uniqueAssignedRoles, keycloakRoles, keycloakGroups, roleQueries]);

  // Advertencias dinámicas de una tarea
  const getTaskWarnings = (task: BpmnUserTaskAssignmentView): string[] => {
    const warnings: string[] = [];

    for (const g of task.candidateGroups) {
      const health = roleHealthMap.get(g);
      if (health && !health.isLoading) {
        if (!health.existsInKeycloak) {
          warnings.push(`Rol/grupo "${g}" no existe en Keycloak.`);
        } else if (health.isRole && health.userCount === 0) {
          warnings.push(`Rol "${g}" no tiene usuarios en Keycloak.`);
        }
      }
    }

    for (const u of task.candidateUsers) {
      const user = userMap.get(u);
      if (!user && keycloakUsers?.data) {
        warnings.push(`Usuario "${u}" no existe en Keycloak.`);
      } else if (user && !user.enabled) {
        warnings.push(`Usuario "${user.fullName || u}" está inactivo.`);
      }
    }

    return warnings;
  };

  // Métricas del proceso
  const stats = useMemo(() => {
    const total = taskAssignments?.length ?? 0;
    let configured = 0;
    let unassigned = 0;
    let withWarnings = 0;

    for (const t of taskAssignments ?? []) {
      const hasAssignment =
        t.candidateGroups.length > 0 || t.candidateUsers.length > 0;
      if (hasAssignment) {
        configured++;
      } else {
        unassigned++;
      }
      const warnings = getTaskWarnings(t);
      if (warnings.length > 0) {
        withWarnings++;
      }
    }

    return {
      total,
      configured,
      unassigned,
      withWarnings,
    };
  }, [taskAssignments, roleHealthMap, userMap, keycloakUsers]);

  // Opciones de grupos y roles agrupadas
  const groupedGroupAndRoleOptions = useMemo(() => {
    const roleOptions = (keycloakRoles ?? []).map((r) => ({
      value: r.name,
      label: `🛡️ ${r.name}${r.description ? ` (${r.description})` : ""}`,
    }));

    const groupOptions = (keycloakGroups ?? []).map((g) => ({
      value: g.name,
      label: `👥 ${g.name} (${g.path})`,
    }));

    return [
      {
        label: `Roles de Keycloak (${roleOptions.length})`,
        options: roleOptions,
      },
      {
        label: `Grupos Organizacionales (${groupOptions.length})`,
        options: groupOptions,
      },
    ];
  }, [keycloakRoles, keycloakGroups]);

  // Opciones de usuarios de Keycloak
  const userOptions = useMemo(() => {
    const list: Array<{ value: string; label: string; disabled?: boolean }> = [];
    const seen = new Set<string>();

    for (const u of keycloakUsers?.data ?? []) {
      if (!seen.has(u.username)) {
        seen.add(u.username);
        const nameText = u.fullName || u.username;
        const displayLabel = `${nameText} (@${u.username}${u.email ? ` - ${u.email}` : ""})${!u.enabled ? " [INACTIVO]" : ""}`;
        list.push({
          value: u.username,
          label: displayLabel,
          disabled: !u.enabled,
        });
      }
    }

    return list;
  }, [keycloakUsers]);

  // Abrir modal de configuración de responsables
  const handleOpenConfigModal = (record: BpmnUserTaskAssignmentView) => {
    setEditingTask(record);
    setModalGroups([...record.candidateGroups]);
    setModalUsers(
      record.candidateUsers.map((u) => userMap.get(u)?.username || u),
    );
  };

  // Guardar desde el modal de responsables
  const handleSaveModal = async () => {
    if (!editingTask || !activeProcessKey) return;

    try {
      const normalizedUsers = modalUsers.map(
        (u) => userMap.get(u)?.username || u,
      );

      await upsertMutation.mutateAsync({
        processDefinitionKey: activeProcessKey,
        taskDefinitionKey: editingTask.taskDefinitionKey,
        taskName: editingTask.taskName,
        candidateGroups: modalGroups,
        candidateUsers: normalizedUsers,
        active: true,
      });

      message.success(
        `Asignación actualizada para "${editingTask.taskName}"`,
      );
      setEditingTask(null);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo guardar la asignación"));
    }
  };

  // Filtrado de tareas
  const filteredTasks = useMemo(() => {
    if (!taskAssignments) return [];
    return taskAssignments.filter((t) => {
      if (taskFilter.trim()) {
        const q = taskFilter.toLowerCase();
        const matchText =
          t.taskName?.toLowerCase().includes(q) ||
          t.taskDefinitionKey?.toLowerCase().includes(q);
        if (!matchText) return false;
      }

      const hasAssignment =
        t.candidateGroups.length > 0 || t.candidateUsers.length > 0;
      if (statusFilter === "configured" && !hasAssignment) return false;
      if (statusFilter === "unassigned" && hasAssignment) return false;
      if (statusFilter === "warnings") {
        const warnings = getTaskWarnings(t);
        if (warnings.length === 0) return false;
      }

      return true;
    });
  }, [taskAssignments, taskFilter, statusFilter, roleHealthMap, userMap, keycloakUsers]);

  // Columnas compactas
  const columns: ColumnsType<BpmnUserTaskAssignmentView> = [
    {
      title: "Etapa BPMN (userTask)",
      dataIndex: "taskName",
      key: "taskName",
      width: 310,
      render: (taskName: string, record) => {
        const hasAssignment =
          record.candidateGroups.length > 0 || record.candidateUsers.length > 0;
        const warnings = getTaskWarnings(record);
        const hasForm = configuredFormsMap.has(record.taskDefinitionKey);
        const formObj = configuredFormsMap.get(record.taskDefinitionKey);

        return (
          <Space align="center" size="small">
            <ApartmentOutlined
              style={{
                color: warnings.length ? "#f59e0b" : "#3b82f6",
                fontSize: 14,
                flexShrink: 0,
              }}
            />
            <div>
              <Space size={6} wrap align="center">
                <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                  {taskName || record.taskDefinitionKey}
                </Text>
                <Tag
                  color="geekblue"
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    margin: 0,
                    padding: "0 4px",
                  }}
                >
                  {record.taskDefinitionKey}
                </Tag>
              </Space>

              <div style={{ marginTop: 2, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {warnings.length > 0 ? (
                  <Tooltip
                    title={
                      <div>
                        <strong>Advertencias:</strong>
                        <ul style={{ paddingLeft: 14, margin: "2px 0 0" }}>
                          {warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    }
                  >
                    <Tag
                      color="warning"
                      icon={<WarningOutlined />}
                      style={{ fontSize: 10, margin: 0, padding: "0 4px", cursor: "pointer" }}
                    >
                      Alerta ({warnings.length})
                    </Tag>
                  </Tooltip>
                ) : hasAssignment ? (
                  <Tag
                    color="success"
                    icon={<CheckCircleOutlined />}
                    style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
                  >
                    Asignada
                  </Tag>
                ) : (
                  <Tag
                    color="error"
                    style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
                  >
                    Sin asignar
                  </Tag>
                )}

                {hasForm ? (
                  <Tooltip title={`Formulario configurado: "${formObj?.title || 'Formulario'}"`}>
                    <Tag
                      color="cyan"
                      icon={<FileTextOutlined />}
                      style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
                    >
                      Formulario listo
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag
                    color="default"
                    style={{ fontSize: 10, margin: 0, padding: "0 4px", color: "#94a3b8" }}
                  >
                    Sin formulario
                  </Tag>
                )}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: (
        <Space size={4}>
          <TeamOutlined style={{ color: "#10b981", fontSize: 13 }} />
          <span>Grupos y Roles Candidatos</span>
        </Space>
      ),
      key: "candidateGroups",
      render: (_, record) => {
        if (!record.candidateGroups || record.candidateGroups.length === 0) {
          return (
            <Text type="secondary" style={{ fontStyle: "italic", fontSize: 11 }}>
              —
            </Text>
          );
        }

        return (
          <Space wrap size={[3, 3]}>
            {record.candidateGroups.map((g) => {
              const health = roleHealthMap.get(g);
              const exists = health?.existsInKeycloak ?? true;
              const isEmptyRole =
                Boolean(health?.isRole) &&
                health?.userCount === 0 &&
                !health?.isLoading;

              if (!exists) {
                return (
                  <Tooltip key={g} title={`El rol/grupo "${g}" no existe en Keycloak.`}>
                    <Tag
                      color="error"
                      icon={<CloseCircleOutlined />}
                      style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                    >
                      {g} (No existe)
                    </Tag>
                  </Tooltip>
                );
              }

              if (isEmptyRole) {
                return (
                  <Tooltip
                    key={g}
                    title={`El rol "${g}" no tiene ningún usuario asignado en Keycloak.`}
                  >
                    <Tag
                      color="warning"
                      icon={<WarningOutlined />}
                      style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                    >
                      {g} (0 usuarios)
                    </Tag>
                  </Tooltip>
                );
              }

              const isRole = health?.isRole ?? keycloakRoles?.some((r) => r.name === g);

              return (
                <Tag
                  key={g}
                  color={isRole ? "blue" : "purple"}
                  icon={isRole ? <SafetyCertificateOutlined /> : <TeamOutlined />}
                  style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                >
                  {g}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: (
        <Space size={4}>
          <UserOutlined style={{ color: "#3b82f6", fontSize: 13 }} />
          <span>Usuarios Candidatos</span>
        </Space>
      ),
      key: "candidateUsers",
      render: (_, record) => {
        if (!record.candidateUsers || record.candidateUsers.length === 0) {
          return (
            <Text type="secondary" style={{ fontStyle: "italic", fontSize: 11 }}>
              —
            </Text>
          );
        }

        return (
          <Space wrap size={[3, 3]}>
            {record.candidateUsers.map((u) => {
              const user = userMap.get(u);
              const displayName = user?.fullName || user?.username || u;

              if (!user && keycloakUsers?.data) {
                return (
                  <Tooltip key={u} title={`Usuario "${u}" no existe en Keycloak.`}>
                    <Tag
                      color="error"
                      icon={<CloseCircleOutlined />}
                      style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                    >
                      {u} (No encontrado)
                    </Tag>
                  </Tooltip>
                );
              }

              if (user && !user.enabled) {
                return (
                  <Tooltip key={u} title={`Usuario "${displayName}" está inactivo.`}>
                    <Tag
                      color="warning"
                      icon={<WarningOutlined />}
                      style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                    >
                      {displayName} (Inactivo)
                    </Tag>
                  </Tooltip>
                );
              }

              return (
                <Tag
                  key={u}
                  color="geekblue"
                  icon={<UserOutlined />}
                  style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                >
                  {displayName}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: "Acciones",
      key: "action",
      width: 200,
      align: "center",
      fixed: "right",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Configurar variables y campos dinámicos de esta etapa">
            <Button
              size="small"
              icon={<FileTextOutlined />}
              onClick={() =>
                setFormConfigTask({
                  taskDefinitionKey: record.taskDefinitionKey,
                  taskName: record.taskName || record.taskDefinitionKey,
                })
              }
            >
              Formulario
            </Button>
          </Tooltip>

          <Tooltip title="Configurar qué roles o usuarios atienden esta etapa">
            <Button
              type="primary"
              size="small"
              icon={<SettingOutlined />}
              onClick={() => handleOpenConfigModal(record)}
            >
              Responsables
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {usersError && (
        <Alert
          type="warning"
          showIcon
          style={{ padding: "6px 12px" }}
          message="No se pudieron cargar los usuarios de Keycloak. Verifica la conexión o permisos del token de administración."
        />
      )}

      {/* Barra de Control Compacta y Unificada (Proceso + KPIs chips + Filtros + Botones) */}
      <Card
        size="small"
        styles={{ body: { padding: "8px 12px" } }}
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          background: "#ffffff",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Fila 1: Selector de Proceso, Indicadores KPI compactos y Acciones */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Space wrap size="small">
              {!hideProcessSelector ? (
                <Space size={4}>
                  <ApartmentOutlined style={{ color: "#3b82f6", fontSize: 13 }} />
                  <Text strong style={{ fontSize: 12 }}>Proceso:</Text>
                  <Select
                    size="small"
                    loading={loadingDefs}
                    placeholder="Seleccionar proceso..."
                    value={activeProcessKey}
                    onChange={(val) => setSelectedProcessKey(val)}
                    style={{ width: 280 }}
                    showSearch
                    optionFilterProp="label"
                    options={uniqueProcesses.map((p) => ({
                      value: p.key,
                      label: `${p.name} (${p.key} - v${p.version})`,
                    }))}
                  />
                </Space>
              ) : (
                <Space size={4}>
                  <ApartmentOutlined style={{ color: "#3b82f6", fontSize: 13 }} />
                  <Tag color="geekblue" style={{ fontSize: 11, margin: 0 }}>
                    {activeProcessKey}
                  </Tag>
                </Space>
              )}

              {/* KPIs Compactos tipo Chips */}
              {activeProcessKey && (
                <Space size={4} wrap>
                  <Tag color="blue" style={{ margin: 0, fontSize: 11, padding: "0 6px" }}>
                    Total: <strong>{stats.total}</strong>
                  </Tag>
                  <Tag color="green" style={{ margin: 0, fontSize: 11, padding: "0 6px" }}>
                    Listas: <strong>{stats.configured}</strong>
                  </Tag>
                  {stats.unassigned > 0 ? (
                    <Tag color="error" style={{ margin: 0, fontSize: 11, padding: "0 6px" }}>
                      Sin Asignar: <strong>{stats.unassigned}</strong>
                    </Tag>
                  ) : (
                    <Tag color="default" style={{ margin: 0, fontSize: 11, padding: "0 6px", color: "#64748b" }}>
                      Sin Asignar: 0
                    </Tag>
                  )}
                  {stats.withWarnings > 0 && (
                    <Tag color="warning" icon={<WarningOutlined />} style={{ margin: 0, fontSize: 11, padding: "0 6px" }}>
                      Alertas: <strong>{stats.withWarnings}</strong>
                    </Tag>
                  )}
                </Space>
              )}
            </Space>

            <Space size={6} wrap>
              {activeDefinition && (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => setBpmnModalOpen(true)}
                >
                  Ver BPMN
                </Button>
              )}
              <Button
                size="small"
                icon={<ReloadOutlined spin={loadingTasks} />}
                onClick={() => refetchTasks()}
              >
                Recargar
              </Button>
            </Space>
          </div>

          {/* Fila 2: Buscador y Filtros de Estado */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              borderTop: "1px solid #f1f5f9",
              paddingTop: 6,
            }}
          >
            <Input
              size="small"
              placeholder="Buscar etapa o clave..."
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
              style={{ width: 220 }}
              allowClear
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            />

            <Radio.Group
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="all">Todas ({stats.total})</Radio.Button>
              <Radio.Button value="configured">Listas ({stats.configured})</Radio.Button>
              <Radio.Button value="unassigned">Pendientes ({stats.unassigned})</Radio.Button>
              {stats.withWarnings > 0 && (
                <Radio.Button value="warnings">Alertas ({stats.withWarnings})</Radio.Button>
              )}
            </Radio.Group>
          </div>
        </div>
      </Card>

      {/* Tabla Compacta de Etapas BPMN */}
      {activeProcessKey ? (
        <Table<BpmnUserTaskAssignmentView>
          rowKey="taskDefinitionKey"
          size="small"
          columns={columns}
          dataSource={filteredTasks}
          loading={loadingTasks}
          scroll={{ x: 860 }}
          pagination={false}
          style={{
            backgroundColor: "#fff",
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid #e2e8f0",
          }}
          locale={{
            emptyText: (
              <Empty
                description={
                  taskFilter || statusFilter !== "all"
                    ? `No se encontraron etapas BPMN con el filtro actual.`
                    : "Este proceso BPMN no contiene etapas userTask o no se pudo leer su definición."
                }
              />
            ),
          }}
        />
      ) : (
        <Empty description="Selecciona un proceso BPMN desplegado para configurar sus responsables." />
      )}

      {/* Modal para Ver Diagrama BPMN */}
      <BpmnXmlModal
        open={bpmnModalOpen}
        definitionId={activeDefinition?.id ?? null}
        processName={activeDefinition?.name || activeProcessKey}
        onClose={() => setBpmnModalOpen(false)}
      />

      {/* Modal para Configurar Responsables de Etapa */}
      <Modal
        title={
          <Space>
            <SettingOutlined style={{ color: "#2563eb" }} />
            <span>Configurar Responsables de Etapa BPMN</span>
          </Space>
        }
        open={Boolean(editingTask)}
        onCancel={() => setEditingTask(null)}
        width={680}
        destroyOnClose
        footer={[
          <Button key="cancel" onClick={() => setEditingTask(null)}>
            Cancelar
          </Button>,
          <Button
            key="clear"
            danger
            onClick={() => {
              setModalGroups([]);
              setModalUsers([]);
            }}
            disabled={modalGroups.length === 0 && modalUsers.length === 0}
          >
            Limpiar asignaciones
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={upsertMutation.isPending}
            onClick={handleSaveModal}
          >
            Guardar y Sincronizar
          </Button>,
        ]}
      >
        {editingTask && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              paddingTop: 4,
            }}
          >
            <div
              style={{
                backgroundColor: "#f8fafc",
                borderRadius: 8,
                padding: "10px 14px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <Text
                  type="secondary"
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Etapa / Tarea de Usuario
                </Text>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                  {editingTask.taskName || editingTask.taskDefinitionKey}
                </div>
              </div>
              <Tag
                color="geekblue"
                style={{ fontFamily: "monospace", fontSize: 11 }}
              >
                {editingTask.taskDefinitionKey}
              </Tag>
            </div>

            {/* Grupos y Roles */}
            <div>
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                <Space>
                  <TeamOutlined style={{ color: "#10b981", fontSize: 14 }} />
                  <Text strong style={{ fontSize: 13 }}>
                    Grupos y Roles Candidatos (Keycloak)
                  </Text>
                </Space>
                <Paragraph type="secondary" style={{ fontSize: 11, margin: 0 }}>
                  Cualquier usuario con estos roles o grupos podrá ver y reclamar esta tarea.
                </Paragraph>
                <div style={{ marginTop: 6 }}>
                  <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Seleccionar roles de Keycloak o grupos organizacionales..."
                    value={modalGroups}
                    onChange={setModalGroups}
                    options={groupedGroupAndRoleOptions}
                    allowClear
                  />
                </div>
              </Space>

              {modalGroups.map((g) => {
                const health = roleHealthMap.get(g);
                if (health && !health.isLoading && health.isRole && health.userCount === 0) {
                  return (
                    <Alert
                      key={g}
                      type="warning"
                      showIcon
                      style={{ marginTop: 6, padding: "4px 10px", fontSize: 12 }}
                      message={`El rol "${g}" no tiene usuarios asignados en Keycloak.`}
                    />
                  );
                }
                return null;
              })}
            </div>

            {/* Usuarios Candidatos Directos */}
            <div>
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                <Space>
                  <UserOutlined style={{ color: "#3b82f6", fontSize: 14 }} />
                  <Text strong style={{ fontSize: 13 }}>
                    Usuarios Candidatos Específicos (Keycloak)
                  </Text>
                </Space>
                <Paragraph type="secondary" style={{ fontSize: 11, margin: 0 }}>
                  Opcional. Asigna nominalmente a personas específicas de Keycloak.
                </Paragraph>
                <div style={{ marginTop: 6 }}>
                  <Select
                    mode="multiple"
                    style={{ width: "100%" }}
                    placeholder="Buscar usuario de Keycloak..."
                    value={modalUsers}
                    onChange={setModalUsers}
                    options={userOptions}
                    optionFilterProp="label"
                    loading={loadingUsers}
                    allowClear
                  />
                </div>
              </Space>
            </div>

            {modalGroups.length === 0 && modalUsers.length === 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ padding: "6px 12px", fontSize: 12 }}
                message="Tarea sin responsables definidos"
                description="Solo podrá ser atendida por administradores (workflow-admin)."
              />
            )}
          </div>
        )}
      </Modal>

      {/* Modal para Configurar Formulario Dinámico de la Etapa */}
      <TaskFormConfigModal
        open={Boolean(formConfigTask)}
        processDefinitionKey={activeProcessKey ?? null}
        taskDefinitionKey={formConfigTask?.taskDefinitionKey ?? null}
        taskName={formConfigTask?.taskName ?? null}
        onClose={() => setFormConfigTask(null)}
      />
    </div>
  );
}

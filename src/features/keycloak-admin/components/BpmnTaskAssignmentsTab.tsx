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
  Switch,
  Table,
  Tabs,
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

  const activeProcessKey = selectedProcessKey;

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
  const [modalOrgGroups, setModalOrgGroups] = useState<string[]>([]);
  const [modalKeycloakRoles, setModalKeycloakRoles] = useState<string[]>([]);
  const [modalUsers, setModalUsers] = useState<string[]>([]);
  const [modalAssignToInitiator, setModalAssignToInitiator] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<string>("groups");

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
    max: 500,
  });
  const { data: keycloakRoles } = useKeycloakCandidateRolesQuery({
    first: 0,
    max: 500,
  });
  const {
    data: keycloakUsers,
    isLoading: loadingUsers,
    isError: usersError,
    refetch: refetchUsers,
  } = useKeycloakUsersQuery({
    first: 0,
    max: 1000,
  });

  const upsertMutation = useUpsertTaskAssignmentMutation();

  // Mapa rápido de usuarios para resolver tanto por ID como por username o email
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
      if (u.email) {
        map.set(u.email, item);
      }
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
      // Ignorar asignaciones dinámicas especiales de BPMN
      if (u === "${initiator}" || u === "solicitante" || u.startsWith("${")) {
        continue;
      }
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
      const isDynamic =
        t.defaultAssignee === "${initiator}" ||
        t.candidateUsers.includes("${initiator}") ||
        t.candidateUsers.includes("solicitante") ||
        Boolean(t.defaultAssignee?.startsWith("${"));

      const hasAssignment =
        t.candidateGroups.length > 0 || t.candidateUsers.length > 0 || isDynamic;
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

  const knownRolesSet = useMemo(() => {
    return new Set((keycloakRoles ?? []).map((r) => r.name));
  }, [keycloakRoles]);

  // Opciones separadas: Grupos Organizacionales de Keycloak
  const groupOptions = useMemo(() => {
    return (keycloakGroups ?? []).map((g) => ({
      value: g.name,
      label: `🏢 ${g.name} (${g.path})`,
    }));
  }, [keycloakGroups]);

  // Opciones separadas: Roles de Keycloak
  const roleOptions = useMemo(() => {
    return (keycloakRoles ?? []).map((r) => {
      const health = roleHealthMap.get(r.name);
      const count = health?.userCount;
      const countLabel = count !== undefined ? ` (${count} usuarios)` : "";
      return {
        value: r.name,
        label: `🛡️ ${r.name}${r.description ? ` - ${r.description}` : ""}${countLabel}`,
      };
    });
  }, [keycloakRoles, roleHealthMap]);

  // Opciones de usuarios de Keycloak
  const userOptions = useMemo(() => {
    const list: Array<{ value: string; label: string; disabled?: boolean }> = [];
    const seen = new Set<string>();

    // 1. Usuarios cargados desde Keycloak
    for (const u of keycloakUsers?.data ?? []) {
      if (!seen.has(u.username)) {
        seen.add(u.username);
        const nameText = u.fullName || u.username;
        const displayLabel = `${nameText} (@${u.username}${u.email ? ` - ${u.email}` : ""})${!u.enabled ? " [INACTIVO]" : ""}`;
        list.push({
          value: u.username,
          label: displayLabel,
        });
      }
    }

    // 2. Asegurar que los usuarios actualmente asignados siempre aparezcan en las opciones
    for (const u of modalUsers) {
      if (u === "${initiator}" || u === "solicitante" || u.startsWith("${")) continue;
      if (!seen.has(u)) {
        seen.add(u);
        const known = userMap.get(u);
        list.unshift({
          value: u,
          label: known
            ? `${known.fullName} (@${known.username}${known.email ? ` - ${known.email}` : ""})`
            : `@${u}`,
        });
      }
    }

    // Ordenar alfabéticamente
    return list.sort((a, b) => a.label.localeCompare(b.label));
  }, [keycloakUsers, modalUsers, userMap]);

  // Abrir modal de configuración de responsables
  const handleOpenConfigModal = (record: BpmnUserTaskAssignmentView) => {
    setEditingTask(record);

    const orgGroups: string[] = [];
    const kcRoles: string[] = [];

    for (const g of record.candidateGroups) {
      if (knownRolesSet.has(g)) {
        kcRoles.push(g);
      } else {
        orgGroups.push(g);
      }
    }

    setModalOrgGroups(orgGroups);
    setModalKeycloakRoles(kcRoles);

    const isInitiator =
      record.candidateUsers.includes("${initiator}") ||
      record.candidateUsers.includes("solicitante") ||
      record.defaultAssignee === "${initiator}";

    setModalAssignToInitiator(isInitiator);

    const normalUsers = record.candidateUsers.filter(
      (u) => u !== "${initiator}" && u !== "solicitante" && !u.startsWith("${"),
    );
    setModalUsers(normalUsers.map((u) => userMap.get(u)?.username || u));

    if (isInitiator) {
      setActiveModalTab("initiator");
    } else if (orgGroups.length > 0) {
      setActiveModalTab("groups");
    } else if (kcRoles.length > 0) {
      setActiveModalTab("roles");
    } else {
      setActiveModalTab("groups");
    }
  };

  // Guardar desde el modal de responsables
  const handleSaveModal = async () => {
    if (!editingTask || !activeProcessKey) return;

    try {
      const normalizedUsers = modalUsers.map(
        (u) => userMap.get(u)?.username || u,
      );

      if (modalAssignToInitiator && !normalizedUsers.includes("${initiator}")) {
        normalizedUsers.unshift("${initiator}");
      }

      const combinedGroups = Array.from(
        new Set([...modalOrgGroups, ...modalKeycloakRoles]),
      );

      await upsertMutation.mutateAsync({
        processDefinitionKey: activeProcessKey,
        taskDefinitionKey: editingTask.taskDefinitionKey,
        taskName: editingTask.taskName,
        candidateGroups: combinedGroups,
        candidateUsers: normalizedUsers,
        active: true,
      });

      message.success(
        `Responsables actualizados para "${editingTask.taskName || editingTask.taskDefinitionKey}"`,
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
          <TeamOutlined style={{ color: "#7c3aed", fontSize: 13 }} />
          <span>Grupos Organizacionales</span>
        </Space>
      ),
      key: "candidateOrgGroups",
      width: 210,
      render: (_, record) => {
        const groupsOnly = record.candidateGroups.filter((g) => !knownRolesSet.has(g));
        if (groupsOnly.length === 0) {
          return (
            <Text type="secondary" style={{ fontStyle: "italic", fontSize: 11 }}>
              —
            </Text>
          );
        }

        return (
          <Space wrap size={[3, 3]}>
            {groupsOnly.map((g) => (
              <Tag
                key={g}
                color="purple"
                icon={<TeamOutlined />}
                style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
              >
                {g}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: (
        <Space size={4}>
          <SafetyCertificateOutlined style={{ color: "#2563eb", fontSize: 13 }} />
          <span>Roles de Keycloak</span>
        </Space>
      ),
      key: "candidateRoles",
      width: 190,
      render: (_, record) => {
        const rolesOnly = record.candidateGroups.filter((g) => knownRolesSet.has(g));
        if (rolesOnly.length === 0) {
          return (
            <Text type="secondary" style={{ fontStyle: "italic", fontSize: 11 }}>
              —
            </Text>
          );
        }

        return (
          <Space wrap size={[3, 3]}>
            {rolesOnly.map((r) => {
              const health = roleHealthMap.get(r);
              const isEmptyRole =
                Boolean(health?.isRole) &&
                health?.userCount === 0 &&
                !health?.isLoading;

              if (isEmptyRole) {
                return (
                  <Tooltip
                    key={r}
                    title={`El rol "${r}" no tiene usuarios asignados en Keycloak.`}
                  >
                    <Tag
                      color="warning"
                      icon={<WarningOutlined />}
                      style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                    >
                      {r} (0 usuarios)
                    </Tag>
                  </Tooltip>
                );
              }

              return (
                <Tag
                  key={r}
                  color="blue"
                  icon={<SafetyCertificateOutlined />}
                  style={{ fontSize: 11, margin: 0, padding: "0 5px" }}
                >
                  {r}
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
          <UserOutlined style={{ color: "#0284c7", fontSize: 13 }} />
          <span>Usuarios / Solicitante</span>
        </Space>
      ),
      key: "candidateUsers",
      width: 220,
      render: (_, record) => {
        const hasInitiator =
          record.candidateUsers.includes("${initiator}") ||
          record.candidateUsers.includes("solicitante") ||
          record.defaultAssignee === "${initiator}";

        const hasDynamicAssigned =
          record.defaultAssignee === "${encargadoContratacionUserId}" ||
          record.candidateUsers.includes("${encargadoContratacionUserId}");

        const normalUsers = record.candidateUsers.filter(
          (u) => u !== "${initiator}" && u !== "solicitante" && !u.startsWith("${"),
        );

        if (!hasInitiator && !hasDynamicAssigned && normalUsers.length === 0) {
          return (
            <Text type="secondary" style={{ fontStyle: "italic", fontSize: 11 }}>
              —
            </Text>
          );
        }

        return (
          <Space wrap size={[3, 3]}>
            {hasInitiator && (
              <Tooltip title="Esta tarea vuelve y se asigna automáticamente al funcionario que originó la solicitud.">
                <Tag
                  color="success"
                  icon={<UserOutlined />}
                  style={{ fontSize: 11, margin: 0, padding: "0 6px", fontWeight: 600 }}
                >
                  Solicitante / Iniciador
                </Tag>
              </Tooltip>
            )}

            {hasDynamicAssigned && (
              <Tooltip title="Se asigna al profesional designado por la Jefatura de Adquisiciones.">
                <Tag
                  color="cyan"
                  icon={<ApartmentOutlined />}
                  style={{ fontSize: 11, margin: 0, padding: "0 6px" }}
                >
                  Encargado Designado
                </Tag>
              </Tooltip>
            )}

            {normalUsers.map((u) => {
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
                    placeholder="Seleccione un proceso BPMN..."
                    value={activeProcessKey || undefined}
                    onChange={(val) => setSelectedProcessKey(val)}
                    style={{ width: 320 }}
                    showSearch
                    allowClear
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
                disabled={!activeProcessKey}
                icon={<ReloadOutlined spin={loadingTasks} />}
                onClick={() => refetchTasks()}
              >
                Recargar
              </Button>
            </Space>
          </div>

          {/* Fila 2: Buscador y Filtros de Estado (sólo visible si hay un proceso seleccionado) */}
          {activeProcessKey && (
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
          )}
        </div>
      </Card>

      {/* Tabla Compacta de Etapas BPMN o Empty State descriptivo */}
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
        <Card
          style={{
            borderRadius: 8,
            border: "1px dashed #cbd5e1",
            background: "#ffffff",
            textAlign: "center",
            padding: "48px 24px",
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                <Text strong style={{ fontSize: 15, color: "#1e293b" }}>
                  Ningún proceso BPMN seleccionado
                </Text>
                <Text type="secondary" style={{ fontSize: 13, maxWidth: 520 }}>
                  Por favor, elija un proceso de negocio en el selector superior para visualizar y configurar sus etapas, responsables asignados en Keycloak y formularios dinámicos.
                </Text>
              </div>
            }
          />
        </Card>
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
              setModalOrgGroups([]);
              setModalKeycloakRoles([]);
              setModalUsers([]);
              setModalAssignToInitiator(false);
            }}
            disabled={
              !modalAssignToInitiator &&
              modalOrgGroups.length === 0 &&
              modalKeycloakRoles.length === 0 &&
              modalUsers.length === 0
            }
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
              gap: 14,
              paddingTop: 4,
            }}
          >
            {/* Cabecera de la etapa */}
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
                  Etapa / Tarea BPMN
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

            {/* Asignación Especial Dinámica: Solicitante / Iniciador */}
            <Card
              size="small"
              style={{
                borderRadius: 8,
                border: modalAssignToInitiator ? "1px solid #86efac" : "1px solid #e2e8f0",
                background: modalAssignToInitiator ? "#f0fdf4" : "#ffffff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <Space align="center" size="small">
                    <UserOutlined
                      style={{
                        color: modalAssignToInitiator ? "#16a34a" : "#64748b",
                        fontSize: 16,
                      }}
                    />
                    <Text
                      strong
                      style={{
                        fontSize: 13,
                        color: modalAssignToInitiator ? "#15803d" : "#0f172a",
                      }}
                    >
                      Asignar automáticamente al Solicitante / Iniciador del Trámite
                    </Text>
                    {modalAssignToInitiator && (
                      <Tag color="success" style={{ fontSize: 10, padding: "0 4px" }}>
                        Activo (${`initiator`})
                      </Tag>
                    )}
                  </Space>
                  <Paragraph
                    type="secondary"
                    style={{ fontSize: 11, margin: "2px 0 0" }}
                  >
                    Recomendado para etapas de <strong>Subsanación / Ajuste de Solicitud</strong>. Cuando el trámite sea observado o devuelto, regresará directamente a la bandeja de quien originó la solicitud.
                  </Paragraph>
                </div>
                <Switch
                  checked={modalAssignToInitiator}
                  onChange={(checked) => setModalAssignToInitiator(checked)}
                  checkedChildren="Sí"
                  unCheckedChildren="No"
                />
              </div>
            </Card>

            {/* Pestañas para configurar por Grupos, Roles o Usuarios */}
            <Tabs
              activeKey={activeModalTab}
              onChange={setActiveModalTab}
              type="card"
              size="small"
              items={[
                {
                  key: "groups",
                  label: (
                    <Space size={4}>
                      <TeamOutlined style={{ color: "#7c3aed" }} />
                      <span>Grupos Keycloak</span>
                      {modalOrgGroups.length > 0 && (
                        <Tag
                          color="purple"
                          style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
                        >
                          {modalOrgGroups.length}
                        </Tag>
                      )}
                    </Space>
                  ),
                  children: (
                    <div style={{ paddingTop: 4 }}>
                      <Paragraph
                        type="secondary"
                        style={{ fontSize: 12, marginBottom: 8 }}
                      >
                        Asigna la tarea a departamentos o unidades completas (ej:{" "}
                        <code>encargado-almacenes</code>,{" "}
                        <code>encargado-presupuestos</code>,{" "}
                        <code>gerencia-administrativa-financiera</code>). Cualquier miembro
                        del grupo podrá ver y reclamar la tarea.
                      </Paragraph>
                      <Select
                        mode="tags"
                        style={{ width: "100%" }}
                        placeholder="Seleccionar grupos organizacionales de Keycloak..."
                        value={modalOrgGroups}
                        onChange={setModalOrgGroups}
                        options={groupOptions}
                        allowClear
                      />
                    </div>
                  ),
                },
                {
                  key: "roles",
                  label: (
                    <Space size={4}>
                      <SafetyCertificateOutlined style={{ color: "#2563eb" }} />
                      <span>Roles Keycloak</span>
                      {modalKeycloakRoles.length > 0 && (
                        <Tag
                          color="blue"
                          style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
                        >
                          {modalKeycloakRoles.length}
                        </Tag>
                      )}
                    </Space>
                  ),
                  children: (
                    <div style={{ paddingTop: 4 }}>
                      <Paragraph
                        type="secondary"
                        style={{ fontSize: 12, marginBottom: 8 }}
                      >
                        Asigna la tarea por rol jerárquico o de seguridad (ej:{" "}
                        <code>gerente-general</code>, <code>gerente-area</code>,{" "}
                        <code>workflow-admin</code>).
                      </Paragraph>
                      <Select
                        mode="tags"
                        style={{ width: "100%" }}
                        placeholder="Seleccionar roles de Keycloak..."
                        value={modalKeycloakRoles}
                        onChange={setModalKeycloakRoles}
                        options={roleOptions}
                        allowClear
                      />
                    </div>
                  ),
                },
                {
                  key: "users",
                  label: (
                    <Space size={4}>
                      <UserOutlined style={{ color: "#0284c7" }} />
                      <span>Usuarios Específicos</span>
                      {modalUsers.length > 0 && (
                        <Tag
                          color="cyan"
                          style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
                        >
                          {modalUsers.length}
                        </Tag>
                      )}
                    </Space>
                  ),
                  children: (
                    <div style={{ paddingTop: 4 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <Paragraph
                          type="secondary"
                          style={{ fontSize: 12, margin: 0 }}
                        >
                          Asignación nominal directa a funcionarios específicos.
                        </Paragraph>
                        <Button
                          size="small"
                          type="link"
                          icon={<ReloadOutlined spin={loadingUsers} />}
                          onClick={() => refetchUsers()}
                          style={{ fontSize: 11, padding: 0 }}
                        >
                          Actualizar ({userOptions.length} disponibles)
                        </Button>
                      </div>
                      <Select
                        mode="multiple"
                        style={{ width: "100%" }}
                        placeholder="Buscar por nombre, usuario (@) o correo electrónico..."
                        value={modalUsers}
                        onChange={setModalUsers}
                        options={userOptions}
                        showSearch
                        filterOption={(input, option) => {
                          const label = String(option?.label ?? "").toLowerCase();
                          const val = String(option?.value ?? "").toLowerCase();
                          const search = input.toLowerCase();
                          return label.includes(search) || val.includes(search);
                        }}
                        loading={loadingUsers}
                        allowClear
                        maxTagCount="responsive"
                      />
                    </div>
                  ),
                },
              ]}
            />

            {/* Resumen de Responsables Configurados */}
            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            >
              <Text
                strong
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Resumen de Responsables:
              </Text>
              <div
                style={{
                  marginTop: 4,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {modalAssignToInitiator && (
                  <Tag
                    color="success"
                    icon={<UserOutlined />}
                    style={{ fontWeight: 600 }}
                  >
                    Solicitante / Iniciador (${`initiator`})
                  </Tag>
                )}
                {modalOrgGroups.map((g) => (
                  <Tag key={g} color="purple" icon={<TeamOutlined />}>
                    {g}
                  </Tag>
                ))}
                {modalKeycloakRoles.map((r) => (
                  <Tag key={r} color="blue" icon={<SafetyCertificateOutlined />}>
                    {r}
                  </Tag>
                ))}
                {modalUsers.map((u) => (
                  <Tag key={u} color="cyan" icon={<UserOutlined />}>
                    @{u}
                  </Tag>
                ))}
                {!modalAssignToInitiator &&
                  modalOrgGroups.length === 0 &&
                  modalKeycloakRoles.length === 0 &&
                  modalUsers.length === 0 && (
                    <Text type="secondary" italic style={{ fontSize: 11 }}>
                      Sin responsables específicos (solo administradores de sistema
                      podrán atenderla)
                    </Text>
                  )}
              </div>
            </div>
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

import {
  ApartmentOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  TeamOutlined,
  UndoOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDefinitionsQuery } from "../../definitions";
import {
  useKeycloakCandidateRolesQuery,
  useKeycloakGroupsQuery,
  useKeycloakUsersQuery,
  useProcessTaskAssignmentsQuery,
  useUpsertTaskAssignmentMutation,
} from "../hooks/useKeycloakAdminQueries";
import type { BpmnUserTaskAssignmentView } from "../types/keycloak-admin.types";

const { Text } = Typography;

export interface BpmnTaskAssignmentsTabProps {
  initialProcessKey?: string;
  hideHeaderBanner?: boolean;
  hideProcessSelector?: boolean;
}

export function BpmnTaskAssignmentsTab({
  initialProcessKey,
  hideHeaderBanner = false,
  hideProcessSelector = false,
}: BpmnTaskAssignmentsTabProps = {}) {
  const { data: definitionsPage, isLoading: loadingDefs } = useDefinitionsQuery(
    { size: 100 },
  );

  // Deduplicar procesos por key tomando la versión más reciente
  const uniqueProcesses = useMemo(() => {
    const map = new Map<string, { key: string; name: string; version: number }>();
    for (const def of definitionsPage?.data ?? []) {
      const current = map.get(def.key);
      if (!current || def.version > current.version) {
        map.set(def.key, {
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

  const [taskFilter, setTaskFilter] = useState("");

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

  // Estado local editable: `${processKey}:${taskDefinitionKey}`
  const [drafts, setDrafts] = useState<
    Record<string, { candidateGroups: string[]; candidateUsers: string[] }>
  >({});

  // Mapa rápido de usuarios para resolver tanto por ID como por username
  const userMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; username: string; fullName: string; email?: string }
    >();
    for (const u of keycloakUsers?.data ?? []) {
      const item = {
        id: u.id,
        username: u.username,
        fullName: u.fullName || u.username,
        email: u.email,
      };
      map.set(u.id, item);
      map.set(u.username, item);
    }
    return map;
  }, [keycloakUsers]);

  // Opciones de grupos y roles
  const groupAndRoleOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; type: "group" | "role" }> = [];
    const seen = new Set<string>();

    for (const g of keycloakGroups ?? []) {
      seen.add(g.name);
      opts.push({
        value: g.name,
        label: `👥 Grupo: ${g.name} (${g.path})`,
        type: "group",
      });
    }

    for (const r of keycloakRoles ?? []) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        opts.push({
          value: r.name,
          label: `🛡️ Rol: ${r.name}`,
          type: "role",
        });
      }
    }

    return opts;
  }, [keycloakGroups, keycloakRoles]);

  // Opciones de usuarios de Keycloak con etiquetas de texto limpias
  const userOptions = useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    for (const u of keycloakUsers?.data ?? []) {
      if (!seen.has(u.username)) {
        seen.add(u.username);
        const displayLabel =
          u.fullName && u.fullName !== u.username
            ? `${u.fullName} (@${u.username})`
            : `@${u.username}`;
        list.push({
          value: u.username,
          label: displayLabel,
        });
      }
    }

    return list;
  }, [keycloakUsers]);

  const getDraftKey = (taskKey: string) =>
    `${activeProcessKey ?? ""}:${taskKey}`;

  const isRowModified = useCallback(
    (record: BpmnUserTaskAssignmentView) => {
      const draftKey = `${activeProcessKey ?? ""}:${record.taskDefinitionKey}`;
      const draft = drafts[draftKey];
      if (!draft) return false;

      // Normalizar a username para comparar
      const currentUsers = (draft.candidateUsers || []).map(
        (u) => userMap.get(u)?.username || u,
      );
      const originalUsers = (record.candidateUsers || []).map(
        (u) => userMap.get(u)?.username || u,
      );

      const groupsChanged =
        JSON.stringify([...draft.candidateGroups].sort()) !==
        JSON.stringify([...record.candidateGroups].sort());
      const usersChanged =
        JSON.stringify([...currentUsers].sort()) !==
        JSON.stringify([...originalUsers].sort());

      return groupsChanged || usersChanged;
    },
    [drafts, userMap, activeProcessKey],
  );

  const modifiedRowsCount = useMemo(() => {
    return (taskAssignments ?? []).filter((t) => isRowModified(t)).length;
  }, [taskAssignments, isRowModified]);

  // Guardar tarea individual
  const handleSave = async (record: BpmnUserTaskAssignmentView) => {
    if (!activeProcessKey) return;
    const draftKey = getDraftKey(record.taskDefinitionKey);
    const draft = drafts[draftKey] ?? {
      candidateGroups: record.candidateGroups,
      candidateUsers: record.candidateUsers,
    };

    // Normalizar a username para consistencia
    const normalizedUsers = draft.candidateUsers.map(
      (u) => userMap.get(u)?.username || u,
    );

    try {
      await upsertMutation.mutateAsync({
        processDefinitionKey: activeProcessKey,
        taskDefinitionKey: record.taskDefinitionKey,
        taskName: record.taskName,
        candidateGroups: draft.candidateGroups,
        candidateUsers: normalizedUsers,
        active: true,
      });

      // Limpiar draft para esta fila
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[draftKey];
        return next;
      });

      message.success(
        `Asignación guardada para "${record.taskName}" y sincronizada con el motor BPMN`,
      );
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "No se pudo guardar la asignación de la tarea",
      );
    }
  };

  // Deshacer cambios de una fila
  const handleRevert = (record: BpmnUserTaskAssignmentView) => {
    const draftKey = getDraftKey(record.taskDefinitionKey);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  // Guardar todos los cambios pendientes en bloque
  const handleSaveAll = async () => {
    if (!activeProcessKey) return;
    const modifiedTasks = (taskAssignments ?? []).filter((t) => isRowModified(t));
    if (modifiedTasks.length === 0) return;

    try {
      for (const t of modifiedTasks) {
        const draftKey = getDraftKey(t.taskDefinitionKey);
        const draft = drafts[draftKey];
        if (draft) {
          const normalizedUsers = draft.candidateUsers.map(
            (u) => userMap.get(u)?.username || u,
          );
          await upsertMutation.mutateAsync({
            processDefinitionKey: activeProcessKey,
            taskDefinitionKey: t.taskDefinitionKey,
            taskName: t.taskName,
            candidateGroups: draft.candidateGroups,
            candidateUsers: normalizedUsers,
            active: true,
          });
        }
      }

      setDrafts({});
      message.success(
        `Se guardaron correctamente las asignaciones de ${modifiedTasks.length} tareas`,
      );
    } catch (err: unknown) {
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "Error al guardar los cambios en bloque",
      );
    }
  };

  // Filtrado de tareas
  const filteredTasks = useMemo(() => {
    if (!taskAssignments) return [];
    if (!taskFilter.trim()) return taskAssignments;
    const q = taskFilter.toLowerCase();
    return taskAssignments.filter(
      (t) =>
        t.taskName?.toLowerCase().includes(q) ||
        t.taskDefinitionKey?.toLowerCase().includes(q),
    );
  }, [taskAssignments, taskFilter]);

  const columns: ColumnsType<BpmnUserTaskAssignmentView> = [
    {
      title: "Etapa / Tarea BPMN (userTask)",
      dataIndex: "taskName",
      key: "taskName",
      width: 250,
      render: (taskName: string, record) => {
        const modified = isRowModified(record);
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                {taskName || record.taskDefinitionKey}
              </Text>
              {modified && (
                <Tag color="warning" style={{ fontSize: 11, padding: "0 6px" }}>
                  Modificado
                </Tag>
              )}
            </div>
            <div style={{ marginTop: 4 }}>
              <Tag color="geekblue" style={{ fontFamily: "monospace", fontSize: 11 }}>
                {record.taskDefinitionKey}
              </Tag>
            </div>
          </div>
        );
      },
    },
    {
      title: (
        <Space>
          <TeamOutlined style={{ color: "#10b981" }} />
          <span>Grupos y Roles Candidatos</span>
        </Space>
      ),
      key: "candidateGroups",
      render: (_, record) => {
        const draftKey = getDraftKey(record.taskDefinitionKey);
        const current =
          drafts[draftKey]?.candidateGroups ?? record.candidateGroups;
        return (
          <Select
            mode="tags"
            style={{ width: "100%" }}
            placeholder="Selecciona grupos organizacionales o roles..."
            value={current}
            options={groupAndRoleOptions}
            allowClear
            onChange={(values) =>
              setDrafts((prev) => ({
                ...prev,
                [draftKey]: {
                  candidateGroups: values,
                  candidateUsers:
                    prev[draftKey]?.candidateUsers ?? record.candidateUsers,
                },
              }))
            }
          />
        );
      },
    },
    {
      title: (
        <Space>
          <UserOutlined style={{ color: "#3b82f6" }} />
          <span>Usuarios Candidatos Directos (Keycloak)</span>
        </Space>
      ),
      key: "candidateUsers",
      render: (_, record) => {
        const draftKey = getDraftKey(record.taskDefinitionKey);
        const rawUsers =
          drafts[draftKey]?.candidateUsers ?? record.candidateUsers;

        // Mapear tanto UUID como username a la opción correcta
        const currentValues = rawUsers.map(
          (u) => userMap.get(u)?.username || u,
        );

        return (
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="Buscar por nombre, apellido o @usuario de Keycloak..."
            value={currentValues}
            options={userOptions}
            optionFilterProp="label"
            loading={loadingUsers}
            allowClear
            onChange={(values) =>
              setDrafts((prev) => ({
                ...prev,
                [draftKey]: {
                  candidateGroups:
                    prev[draftKey]?.candidateGroups ?? record.candidateGroups,
                  candidateUsers: values,
                },
              }))
            }
          />
        );
      },
    },
    {
      title: "Acciones",
      key: "action",
      width: 140,
      fixed: "right",
      render: (_, record) => {
        const modified = isRowModified(record);
        return (
          <Space size="small">
            <Button
              type={modified ? "primary" : "default"}
              size="small"
              icon={<SaveOutlined />}
              loading={upsertMutation.isPending}
              onClick={() => handleSave(record)}
              style={
                modified
                  ? { backgroundColor: "#16a34a", borderColor: "#16a34a" }
                  : undefined
              }
            >
              Guardar
            </Button>

            {modified && (
              <Tooltip title="Deshacer cambios de esta tarea">
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => handleRevert(record)}
                />
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Banner Informativo */}
      {!hideHeaderBanner && (
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined style={{ color: "#0284c7" }} />}
          message="Gestión Dinámica de Responsables y Aprobadores"
          description={
            <div>
              Configura qué <strong>Grupos/Roles organizacionales</strong> o qué{" "}
              <strong>Usuarios específicos de Keycloak</strong> pueden evaluar y atender cada tarea del trámite.
              Los cambios se guardan directamente en base de datos y se sincronizan en caliente sin necesidad de
              modificar el archivo BPMN ni reiniciar servidores.
            </div>
          }
        />
      )}

      {usersError && (
        <Alert
          type="warning"
          showIcon
          message="No se pudieron cargar los usuarios de Keycloak"
          description="Verifica que el servicio de Keycloak esté en línea o que el token de administración tenga permisos para consultar el directorio de usuarios."
        />
      )}

      {/* Barra de Control: Proceso, Buscador y Botones de Guardado en Bloque */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          background: "#ffffff",
        }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Space wrap size="middle">
              {!hideProcessSelector ? (
                <Space>
                  <ApartmentOutlined style={{ color: "#3b82f6", fontSize: 16 }} />
                  <Text strong>Trámite / Proceso:</Text>
                  <Select
                    loading={loadingDefs}
                    placeholder="Selecciona un proceso BPMN..."
                    value={activeProcessKey}
                    onChange={(val) => {
                      setDrafts({});
                      setSelectedProcessKey(val);
                    }}
                    style={{ width: 320 }}
                    showSearch
                    optionFilterProp="label"
                    options={uniqueProcesses.map((p) => ({
                      value: p.key,
                      label: `${p.name} (${p.key} - v${p.version})`,
                    }))}
                  />
                </Space>
              ) : (
                <Space>
                  <ApartmentOutlined style={{ color: "#3b82f6", fontSize: 16 }} />
                  <Text strong>Proceso:</Text>
                  <Tag color="geekblue" style={{ fontSize: 13, padding: "2px 8px" }}>
                    {activeProcessKey}
                  </Tag>
                </Space>
              )}

              <Input
                placeholder="Filtrar tareas (ej. existencias)..."
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                style={{ width: 220 }}
                allowClear
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              />
            </Space>
          </Col>

          <Col xs={24} lg={10} style={{ textAlign: "right" }}>
            <Space wrap>
              {modifiedRowsCount > 0 && (
                <>
                  <Tag color="warning" style={{ fontSize: 13, padding: "3px 8px" }}>
                    {modifiedRowsCount} {modifiedRowsCount === 1 ? "tarea modificada" : "tareas modificadas"}
                  </Tag>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={upsertMutation.isPending}
                    onClick={handleSaveAll}
                    style={{ backgroundColor: "#16a34a", borderColor: "#16a34a" }}
                  >
                    Guardar Todos los Cambios
                  </Button>
                  <Button
                    icon={<UndoOutlined />}
                    onClick={() => setDrafts({})}
                  >
                    Descartar Todo
                  </Button>
                </>
              )}

              <Button
                icon={<ReloadOutlined spin={loadingTasks} />}
                onClick={() => refetchTasks()}
              >
                Recargar
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tabla de Mapeo de Tareas BPMN */}
      {activeProcessKey ? (
        <Table<BpmnUserTaskAssignmentView>
          rowKey="taskDefinitionKey"
          columns={columns}
          dataSource={filteredTasks}
          loading={loadingTasks}
          scroll={{ x: 920 }}
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
                  taskFilter
                    ? `No se encontraron etapas BPMN que coincidan con "${taskFilter}".`
                    : "Este proceso BPMN no contiene etapas userTask o no se pudo leer su definición."
                }
              />
            ),
          }}
        />
      ) : (
        <Empty description="Selecciona un proceso BPMN desplegado para configurar sus responsables." />
      )}
    </div>
  );
}

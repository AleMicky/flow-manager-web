import {
  ApartmentOutlined,
  SaveOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";
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

export function BpmnTaskAssignmentsTab() {
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
  >(undefined);

  const activeProcessKey = selectedProcessKey ?? uniqueProcesses[0]?.key;

  const { data: taskAssignments, isLoading: loadingTasks } =
    useProcessTaskAssignmentsQuery(
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
  const { data: keycloakUsers } = useKeycloakUsersQuery({
    first: 0,
    max: 100,
  });

  const upsertMutation = useUpsertTaskAssignmentMutation();

  // Estado local editable por `${processKey}:${taskDefinitionKey}`
  const [drafts, setDrafts] = useState<
    Record<string, { candidateGroups: string[]; candidateUsers: string[] }>
  >({});

  const groupAndRoleOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    for (const g of keycloakGroups ?? []) {
      seen.add(g.name);
      opts.push({
        value: g.name,
        label: `Grupo: ${g.name} (${g.path})`,
      });
    }

    for (const r of keycloakRoles ?? []) {
      if (!seen.has(r.name)) {
        seen.add(r.name);
        opts.push({
          value: r.name,
          label: `Rol (${r.source}): ${r.name}`,
        });
      }
    }

    return opts;
  }, [keycloakGroups, keycloakRoles]);

  const userOptions = useMemo(() => {
    return (keycloakUsers?.data ?? []).map((u) => ({
      value: u.id,
      label: `${u.fullName} (@${u.username})`,
    }));
  }, [keycloakUsers]);

  const getDraftKey = (taskKey: string) =>
    `${activeProcessKey ?? ""}:${taskKey}`;

  const handleSave = async (record: BpmnUserTaskAssignmentView) => {
    if (!activeProcessKey) return;
    const draftKey = getDraftKey(record.taskDefinitionKey);
    const draft = drafts[draftKey] ?? {
      candidateGroups: record.candidateGroups,
      candidateUsers: record.candidateUsers,
    };

    try {
      await upsertMutation.mutateAsync({
        processDefinitionKey: activeProcessKey,
        taskDefinitionKey: record.taskDefinitionKey,
        taskName: record.taskName,
        candidateGroups: draft.candidateGroups,
        candidateUsers: draft.candidateUsers,
        active: true,
      });
      message.success(
        `Asignación guardada para la tarea "${record.taskName}" y sincronizada con Flowable`,
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

  const columns: ColumnsType<BpmnUserTaskAssignmentView> = [
    {
      title: "Tarea BPMN (userTask)",
      dataIndex: "taskName",
      key: "taskName",
      width: 220,
      render: (taskName: string, record) => (
        <div>
          <Text strong>{taskName}</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color="geekblue">{record.taskDefinitionKey}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: (
        <Space>
          <TeamOutlined style={{ color: "#10b981" }} />
          <span>Grupos / Roles Candidatos (Keycloak)</span>
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
            placeholder="Selecciona grupos o roles de Keycloak..."
            value={current}
            options={groupAndRoleOptions}
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
        const current =
          drafts[draftKey]?.candidateUsers ?? record.candidateUsers;
        return (
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="Selecciona usuarios específicos (opcional)..."
            value={current}
            options={userOptions}
            optionFilterProp="label"
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
      title: "Acción",
      key: "action",
      width: 130,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<SaveOutlined />}
          loading={upsertMutation.isPending}
          onClick={() => handleSave(record)}
        >
          Guardar
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Alert
        type="info"
        showIcon
        title="Asignación Dinámica sin quemar en el XML BPMN"
        description="Selecciona un proceso BPMN desplegado en Flowable y asigna qué Grupos, Roles o Usuarios de Keycloak pueden reclamar y atender cada etapa (userTask). Los cambios se guardan en PostgreSQL (workflow_task_assignments) y se aplican de inmediato."
      />

      <Space wrap align="center">
        <ApartmentOutlined style={{ color: "#3b82f6", fontSize: 16 }} />
        <Text strong>Proceso BPMN:</Text>
        <Select
          loading={loadingDefs}
          placeholder="Selecciona un proceso BPMN..."
          value={activeProcessKey}
          onChange={setSelectedProcessKey}
          style={{ width: 340 }}
          showSearch
          optionFilterProp="label"
          options={uniqueProcesses.map((p) => ({
            value: p.key,
            label: `${p.name} (${p.key} - v${p.version})`,
          }))}
        />
      </Space>

      {activeProcessKey ? (
        <Table<BpmnUserTaskAssignmentView>
          rowKey="taskDefinitionKey"
          columns={columns}
          dataSource={taskAssignments ?? []}
          loading={loadingTasks}
          scroll={{ x: 860 }}
          pagination={false}
          locale={{
            emptyText: (
              <Empty description="Este proceso BPMN no contiene etapas userTask o no se pudo leer su definición." />
            ),
          }}
        />
      ) : (
        <Empty description="Selecciona un proceso BPMN desplegado para configurar sus responsables." />
      )}
    </div>
  );
}

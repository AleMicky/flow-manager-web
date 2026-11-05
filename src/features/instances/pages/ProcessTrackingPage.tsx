import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  PauseCircleOutlined,
  PictureOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDefinitionsQuery } from "../../definitions";
import { useProcessTaskAssignmentsQuery } from "../../keycloak-admin/hooks/useKeycloakAdminQueries";
import { TaskAntecedentsViewer } from "../../tasks";
import { PRGaf08MatrixViewer } from "../components/PRGaf08MatrixViewer";
import {
  useAvailableProcessesQuery,
  useInstanceDetailQuery,
  useInstanceDiagramQuery,
  useInstanceHistoricTasksQuery,
  useInstanceVariablesQuery,
  useInstancesQuery,
} from "../hooks/useInstancesQueries";
import type { ProcessInstance } from "../types/instances.types";
import {
  formatActivityName,
  formatDuration,
  getProcessFriendlyName,
} from "../utils/instanceFormatters";

const { Title, Text } = Typography;

type InstanceStatusFilter = "all" | "active" | "completed";

export function ProcessTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProcessKey = searchParams.get("processKey") || undefined;
  const initialInstanceId = searchParams.get("instanceId") || null;

  // Catálogo de definiciones y procesos activos
  const { data: definitionsPage, isLoading: loadingDefs } = useDefinitionsQuery(
    { size: 100, latest: true, suspended: false },
  );
  const { data: availableProcesses, isLoading: loadingAvailable } =
    useAvailableProcessesQuery();

  // Deduplicar procesos activos por clave tomando la versión más reciente
  const uniqueProcesses = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        key: string;
        name: string;
        version?: number;
        description?: string | null;
      }
    >();

    // Mapear nombres configurados en el catálogo de procesos activos
    const availableByKey = new Map(
      (availableProcesses ?? [])
        .filter((p) => p.active !== false)
        .map((p) => [p.processDefinitionKey || p.key, p]),
    );

    for (const def of definitionsPage?.data ?? []) {
      if (def.suspended) continue;
      const current = map.get(def.key);
      if (!current || def.version > (current.version ?? 0)) {
        const configured = availableByKey.get(def.key);
        map.set(def.key, {
          id: def.id,
          key: def.key,
          name: configured?.name || def.name || def.key,
          version: def.version,
          description: configured?.description || def.description,
        });
      }
    }

    // Incluir procesos activos de availableProcesses si aún no están en el mapa
    for (const [key, proc] of availableByKey.entries()) {
      if (key && !map.has(key)) {
        map.set(key, {
          id: proc.id,
          key,
          name: proc.name || key,
          description: proc.description,
        });
      }
    }

    return Array.from(map.values());
  }, [definitionsPage, availableProcesses]);

  // Proceso seleccionado (undefined = Todos los procesos activos)
  const [selectedProcessKey, setSelectedProcessKey] = useState<
    string | undefined
  >(initialProcessKey);

  // Instancia / Trámite actualmente seleccionado para consulta detallada
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    initialInstanceId,
  );

  // Buscador de trámites por texto y filtro de estado
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InstanceStatusFilter>("all");

  // Pestaña activa del expediente
  const [activeTab, setActiveTab] = useState<string>("matrix");

  // Query de instancias según el proceso seleccionado (o todos si no se filtra)
  const {
    data: instancesData,
    isLoading: loadingInstances,
    isFetching: fetchingInstances,
    refetch: refetchInstances,
  } = useInstancesQuery({
    ...(selectedProcessKey ? { processDefinitionKey: selectedProcessKey } : {}),
    size: 100,
  });

  // Query del detalle de la instancia seleccionada
  const {
    data: instanceDetail,
    isLoading: loadingDetail,
    refetch: refetchDetail,
  } = useInstanceDetailQuery(
    selectedInstanceId ?? undefined,
    Boolean(selectedInstanceId),
  );

  // Clave del proceso de la instancia seleccionada (para cargar asignaciones correctas)
  const effectiveProcessKey = useMemo(() => {
    if (instanceDetail?.processDefinitionId) {
      return instanceDetail.processDefinitionId.split(":")[0];
    }
    return selectedProcessKey ?? uniqueProcesses[0]?.key;
  }, [instanceDetail, selectedProcessKey, uniqueProcesses]);

  // Query del historial de tareas (las etapas por donde pasó y dónde está)
  const {
    data: historicTasks = [],
    isLoading: loadingHistory,
    refetch: refetchHistory,
  } = useInstanceHistoricTasksQuery(
    selectedInstanceId ?? undefined,
    Boolean(selectedInstanceId),
  );

  // Query de todas las variables y documentos subidos
  const { data: variables, isLoading: loadingVars } = useInstanceVariablesQuery(
    selectedInstanceId ?? undefined,
    Boolean(selectedInstanceId),
  );

  // Query del diagrama BPMN con la etapa resaltada en tiempo real
  const {
    data: diagramUrl,
    isLoading: loadingDiagram,
    isError: isDiagramError,
    refetch: refetchDiagram,
  } = useInstanceDiagramQuery(
    selectedInstanceId ?? undefined,
    Boolean(selectedInstanceId && activeTab === "diagram"),
  );

  // Query de las asignaciones configuradas de las etapas BPMN para mostrar los roles responsables
  const { data: configuredAssignments } = useProcessTaskAssignmentsQuery(
    effectiveProcessKey,
    Boolean(effectiveProcessKey),
  );

  const taskAssignmentsMap = useMemo(() => {
    return new Map(
      (configuredAssignments ?? []).map((a) => [a.taskDefinitionKey, a]),
    );
  }, [configuredAssignments]);

  // Estadísticas sobre las instancias cargadas
  const instanceStats = useMemo(() => {
    const all = instancesData?.data ?? [];
    const activeKeys = new Set(uniqueProcesses.map((p) => p.key));
    const list =
      !selectedProcessKey && activeKeys.size > 0
        ? all.filter((inst) => {
            const pKey = inst.processDefinitionId?.split(":")[0];
            return !pKey || activeKeys.has(pKey);
          })
        : all;

    const active = list.filter((i) => !i.ended).length;
    const completed = list.filter((i) => i.ended).length;
    return {
      list,
      total: list.length,
      active,
      completed,
    };
  }, [instancesData, selectedProcessKey, uniqueProcesses]);

  // Filtrado de trámites en la lista rápida
  const filteredInstances = useMemo(() => {
    let list = instanceStats.list;

    if (statusFilter === "active") {
      list = list.filter((inst) => !inst.ended);
    } else if (statusFilter === "completed") {
      list = list.filter((inst) => inst.ended);
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (inst) =>
        inst.businessKey?.toLowerCase().includes(q) ||
        inst.id.toLowerCase().includes(q) ||
        inst.startUserId?.toLowerCase().includes(q) ||
        inst.registradoPor?.toLowerCase().includes(q) ||
        inst.processDefinitionId?.toLowerCase().includes(q),
    );
  }, [instanceStats.list, statusFilter, searchQuery]);

  // Manejar cambio de proceso
  const handleProcessChange = (procKey?: string) => {
    const normalized = procKey || undefined;
    setSelectedProcessKey(normalized);
    setSelectedInstanceId(null);
    if (normalized) {
      setSearchParams({ processKey: normalized });
    } else {
      setSearchParams({});
    }
  };

  // Manejar selección de trámite
  const handleSelectInstance = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    const params: Record<string, string> = { instanceId };
    if (selectedProcessKey) {
      params.processKey = selectedProcessKey;
    }
    setSearchParams(params);
  };

  // Volver al listado
  const handleBackToList = () => {
    setSelectedInstanceId(null);
    if (selectedProcessKey) {
      setSearchParams({ processKey: selectedProcessKey });
    } else {
      setSearchParams({});
    }
  };

  // Refrescar todo
  const handleRefresh = () => {
    void refetchInstances();
    if (selectedInstanceId) {
      void refetchDetail();
      void refetchHistory();
      void refetchDiagram();
    }
  };

  // Opciones enriquecidas del Select con contador / estado activo
  const selectOptions = useMemo(() => {
    return [
      {
        value: "",
        label: `Todos los procesos activos (${uniqueProcesses.length})`,
        meta: {
          isAll: true,
          name: "Todos los procesos activos",
          key: `${uniqueProcesses.length} disponibles`,
          version: undefined as number | undefined,
        },
      },
      ...uniqueProcesses.map((p) => ({
        value: p.key,
        label: p.version
          ? `${p.name} (${p.key} · v${p.version})`
          : `${p.name} (${p.key})`,
        meta: {
          isAll: false,
          name: p.name,
          key: p.key,
          version: p.version,
        },
      })),
    ];
  }, [uniqueProcesses]);

  // Columnas para la tabla de trámites cuando no hay uno seleccionado
  const instanceColumns: ColumnsType<ProcessInstance> = [
    {
      title: "Expediente / Correlativo",
      dataIndex: "businessKey",
      key: "businessKey",
      width: 220,
      render: (businessKey: string | null, record) => (
        <Space size={10} align="center">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: record.ended ? "#f0fdf4" : "#eff6ff",
              border: `1px solid ${record.ended ? "#bbf7d0" : "#bfdbfe"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: record.ended ? "#16a34a" : "#2563eb",
              fontSize: 15,
              flexShrink: 0,
            }}
          >
            <FileTextOutlined />
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <Text
              strong
              style={{
                color: "#1e40af",
                cursor: "pointer",
                fontSize: 13,
                display: "block",
              }}
              onClick={() => handleSelectInstance(record.id)}
            >
              {businessKey || `EXP-${record.id.substring(0, 8).toUpperCase()}`}
            </Text>
            <Tooltip title={`ID de instancia: ${record.id}`}>
              <Text
                type="secondary"
                style={{ fontSize: 11, fontFamily: "monospace" }}
              >
                #{record.id.substring(0, 12)}…
              </Text>
            </Tooltip>
          </div>
        </Space>
      ),
    },
    {
      title: "Tipo de Trámite",
      dataIndex: "processDefinitionId",
      key: "processDefinitionId",
      render: (defId: string) => {
        const friendlyName = getProcessFriendlyName(
          defId,
          definitionsPage?.data,
          availableProcesses,
        );
        const procKey = defId?.split(":")[0] || "proceso";
        return (
          <div style={{ lineHeight: 1.3 }}>
            <Text strong style={{ fontSize: 12.5, color: "#1e293b", display: "block" }}>
              {friendlyName}
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {procKey}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Etapa Actual / Estado",
      dataIndex: "activityId",
      key: "activityId",
      width: 230,
      render: (activityId: string | null, record) => {
        if (record.ended) {
          return (
            <Tag
              color="success"
              icon={<CheckCircleOutlined />}
              style={{
                borderRadius: 12,
                padding: "2px 10px",
                fontSize: 11.5,
                fontWeight: 500,
              }}
            >
              Concluido / Finalizado
            </Tag>
          );
        }
        if (record.suspended) {
          return (
            <Tag
              color="warning"
              icon={<PauseCircleOutlined />}
              style={{
                borderRadius: 12,
                padding: "2px 10px",
                fontSize: 11.5,
                fontWeight: 500,
              }}
            >
              Pausado
            </Tag>
          );
        }
        const act = formatActivityName(activityId);
        return (
          <Tag
            color="processing"
            icon={<SyncOutlined spin />}
            style={{
              borderRadius: 12,
              padding: "2px 10px",
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            {act.label}
          </Tag>
        );
      },
    },
    {
      title: "Solicitante",
      key: "starter",
      width: 180,
      render: (_, record) => {
        const starter = record.registradoPor || record.startUserId;
        return starter ? (
          <Space size={8}>
            <Avatar
              size={24}
              style={{
                backgroundColor: "#dbeafe",
                color: "#1d4ed8",
                fontSize: 11,
                fontWeight: 600,
              }}
              icon={<UserOutlined />}
            />
            <div style={{ lineHeight: 1.2 }}>
              <Text style={{ fontSize: 12, fontWeight: 500, color: "#334155" }}>
                {starter}
              </Text>
            </div>
          </Space>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            —
          </Text>
        );
      },
    },
    {
      title: "Registro y Duración",
      dataIndex: "startTime",
      key: "startTime",
      width: 190,
      render: (startTime?: string | null, record?: ProcessInstance) => (
        <div style={{ lineHeight: 1.35 }}>
          {startTime ? (
            <Space size={4} style={{ fontSize: 12, color: "#334155" }}>
              <CalendarOutlined style={{ color: "#64748b", fontSize: 11 }} />
              <span>{dayjs(startTime).format("DD/MM/YYYY HH:mm")}</span>
            </Space>
          ) : (
            <Text type="secondary">—</Text>
          )}
          <div>
            <Tag
              bordered={false}
              color={record?.ended ? "default" : "geekblue"}
              style={{ fontSize: 10.5, marginTop: 2, padding: "0 6px" }}
            >
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {formatDuration(null, record?.startTime, record?.ended ? null : null)}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Acción",
      key: "action",
      align: "right",
      width: 150,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleSelectInstance(record.id)}
          style={{ borderRadius: 6, fontWeight: 500 }}
        >
          Ver Expediente
        </Button>
      ),
    },
  ];

  // Datos amigables del trámite seleccionado
  const friendlyProcessName = getProcessFriendlyName(
    instanceDetail?.processDefinitionId || effectiveProcessKey,
    definitionsPage?.data,
    availableProcesses,
  );

  const currentActivity = instanceDetail
    ? formatActivityName(instanceDetail.activityId)
    : null;

  const completedStagesCount = useMemo(
    () => historicTasks.filter((t) => Boolean(t.endTime)).length,
    [historicTasks],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Cabecera Principal con identidad visual profesional */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space size={12} align="center">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 20,
              boxShadow: "0 4px 10px rgba(37, 99, 235, 0.2)",
            }}
          >
            <FileSearchOutlined />
          </div>
          <div>
            <Title
              level={4}
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: "#0f172a",
                lineHeight: 1.25,
              }}
            >
              Consulta y Trazabilidad de Trámites
            </Title>
            <Text type="secondary" style={{ fontSize: 12.5 }}>
              Supervisa en tiempo real la ruta de aprobación, responsables por etapa, tiempos de atención y expediente digital.
            </Text>
          </div>
        </Space>

        <Space size="small" wrap>
          <Tag
            color="green"
            icon={<CheckCircleFilled />}
            style={{
              margin: 0,
              padding: "3px 10px",
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {uniqueProcesses.length}{" "}
            {uniqueProcesses.length === 1 ? "proceso activo" : "procesos activos"}
          </Tag>
          <Button
            size="middle"
            icon={
              <ReloadOutlined
                spin={fetchingInstances || loadingHistory || loadingDetail}
              />
            }
            onClick={handleRefresh}
            style={{ borderRadius: 6 }}
          >
            Actualizar
          </Button>
        </Space>
      </div>

      {/* Barra de Filtro y Control Unificada */}
      <Card
        size="small"
        styles={{ body: { padding: "14px 16px" } }}
        style={{
          borderRadius: 10,
          borderColor: "#e2e8f0",
          background: "#ffffff",
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
        }}
      >
        <Row gutter={[14, 12]} align="middle">
          {/* Selector de Tipo de Trámite (Procesos Activos) */}
          <Col xs={24} lg={10}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Space size={6}>
                <ApartmentOutlined style={{ color: "#2563eb", fontSize: 13 }} />
                <Text
                  strong
                  style={{
                    fontSize: 11.5,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  Tipo de Trámite (Procesos Activos)
                </Text>
              </Space>
              <Select
                size="middle"
                loading={loadingDefs || loadingAvailable}
                placeholder="Todos los procesos activos..."
                value={selectedProcessKey ?? ""}
                onChange={(val) => handleProcessChange(val || undefined)}
                style={{ width: "100%" }}
                showSearch
                optionFilterProp="label"
                options={selectOptions}
                optionRender={(option) => {
                  const meta = option.data.meta;
                  if (meta?.isAll) {
                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "2px 0",
                        }}
                      >
                        <Space size={8}>
                          <Badge status="processing" color="#2563eb" />
                          <Text strong style={{ fontSize: 13 }}>
                            Todos los procesos activos
                          </Text>
                        </Space>
                        <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
                          {uniqueProcesses.length} activos
                        </Tag>
                      </div>
                    );
                  }
                  return (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        padding: "2px 0",
                      }}
                    >
                      <Space size={8} style={{ minWidth: 0 }}>
                        <Badge status="success" />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: 13,
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {meta?.name}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#64748b",
                              fontFamily: "monospace",
                            }}
                          >
                            {meta?.key}
                          </div>
                        </div>
                      </Space>
                      <Space size={4}>
                        {meta?.version && (
                          <Tag
                            color="geekblue"
                            bordered={false}
                            style={{ margin: 0, fontSize: 11 }}
                          >
                            v{meta.version}
                          </Tag>
                        )}
                        <Tag
                          color="success"
                          bordered={false}
                          style={{ margin: 0, fontSize: 10.5 }}
                        >
                          Activo
                        </Tag>
                      </Space>
                    </div>
                  );
                }}
              />
            </div>
          </Col>

          {/* Buscador rápido */}
          <Col xs={24} md={12} lg={7}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Space size={6}>
                <SearchOutlined style={{ color: "#64748b", fontSize: 13 }} />
                <Text
                  strong
                  style={{
                    fontSize: 11.5,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  Búsqueda Rápida
                </Text>
              </Space>
              <Input
                size="middle"
                placeholder="Correlativo, ID o solicitante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                allowClear
              />
            </div>
          </Col>

          {/* Filtro por estado + KPIs */}
          <Col xs={24} md={12} lg={7}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  strong
                  style={{
                    fontSize: 11.5,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  Estado del Trámite
                </Text>
                <Text type="secondary" style={{ fontSize: 11.5 }}>
                  Mostrando <strong>{filteredInstances.length}</strong> de{" "}
                  {instanceStats.total}
                </Text>
              </div>
              <Segmented
                block
                size="middle"
                value={statusFilter}
                onChange={(val) =>
                  setStatusFilter(val as InstanceStatusFilter)
                }
                options={[
                  {
                    label: `Todos (${instanceStats.total})`,
                    value: "all",
                  },
                  {
                    label: `En Curso (${instanceStats.active})`,
                    value: "active",
                  },
                  {
                    label: `Concluidos (${instanceStats.completed})`,
                    value: "completed",
                  },
                ]}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* VISTA 1: LISTADO DE EXPEDIENTES (CUANDO NO SE HA SELECCIONADO UN TRÁMITE) */}
      {!selectedInstanceId && (
        <Card
          size="small"
          styles={{ body: { padding: 0 } }}
          style={{
            borderRadius: 10,
            borderColor: "#e2e8f0",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Table<ProcessInstance>
            rowKey="id"
            size="middle"
            columns={instanceColumns}
            dataSource={filteredInstances}
            loading={loadingInstances}
            scroll={{ x: 900 }}
            onRow={(record) => ({
              onClick: () => handleSelectInstance(record.id),
              style: { cursor: "pointer" },
            })}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} de ${total} trámites`,
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <div style={{ color: "#64748b" }}>
                      {searchQuery || statusFilter !== "all"
                        ? "No se encontraron trámites que coincidan con los criterios de búsqueda."
                        : "No hay trámites registrados para el proceso activo seleccionado."}
                    </div>
                  }
                >
                  {(searchQuery || statusFilter !== "all" || selectedProcessKey) && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        handleProcessChange(undefined);
                      }}
                    >
                      Ver todos los procesos activos
                    </Button>
                  )}
                </Empty>
              ),
            }}
          />
        </Card>
      )}

      {/* VISTA 2: EXPEDIENTE Y ÁRBOL DE TRAZABILIDAD DEL TRÁMITE SELECCIONADO */}
      {selectedInstanceId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Barra de navegación contextual del expediente */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <Space size={12} wrap>
              <Button
                size="small"
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToList}
                style={{ borderRadius: 6, fontWeight: 500 }}
              >
                Volver al listado
              </Button>
              <Breadcrumb
                items={[
                  {
                    title: (
                      <a
                        onClick={(e) => {
                          e.preventDefault();
                          handleBackToList();
                        }}
                      >
                        Trámites Activos
                      </a>
                    ),
                  },
                  {
                    title: friendlyProcessName,
                  },
                  {
                    title: (
                      <Text strong style={{ color: "#1e40af" }}>
                        {instanceDetail?.businessKey ||
                          selectedInstanceId.substring(0, 12)}
                      </Text>
                    ),
                  },
                ]}
              />
            </Space>
          </div>

          {/* Tarjeta Ejecutiva de Resumen del Trámite */}
          <Card
            size="small"
            styles={{ body: { padding: "16px 20px" } }}
            style={{
              borderRadius: 10,
              border: "1px solid #bfdbfe",
              background:
                "linear-gradient(135deg, #eff6ff 0%, #f8fafc 60%, #ffffff 100%)",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.06)",
            }}
          >
            {loadingDetail ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <Spin description="Cargando expediente del trámite..." />
              </div>
            ) : instanceDetail ? (
              <Row gutter={[20, 14]} align="middle">
                <Col xs={24} md={7}>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Expediente / Correlativo
                  </Text>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#1e3a8a",
                      lineHeight: 1.25,
                      marginTop: 2,
                    }}
                  >
                    {instanceDetail.businessKey || instanceDetail.id}
                  </div>
                  <Space size={6} style={{ marginTop: 4 }} wrap>
                    <Tag
                      color="blue"
                      bordered={false}
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {friendlyProcessName}
                    </Tag>
                  </Space>
                </Col>

                <Col xs={12} sm={8} md={6}>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Ubicación Actual
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {instanceDetail.ended ? (
                      <Tag
                        color="success"
                        icon={<CheckCircleOutlined />}
                        style={{
                          fontSize: 12,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontWeight: 600,
                        }}
                      >
                        Concluido con éxito
                      </Tag>
                    ) : (
                      <Tag
                        color="processing"
                        icon={<SyncOutlined spin />}
                        style={{
                          fontSize: 12,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontWeight: 600,
                        }}
                      >
                        {currentActivity?.label ?? "En revisión"}
                      </Tag>
                    )}
                  </div>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, display: "block", marginTop: 4 }}
                  >
                    {completedStagesCount}{" "}
                    {completedStagesCount === 1
                      ? "etapa completada"
                      : "etapas completadas"}
                  </Text>
                </Col>

                <Col xs={12} sm={8} md={5}>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Solicitado Por
                  </Text>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#0f172a",
                      marginTop: 4,
                    }}
                  >
                    <UserOutlined
                      style={{ marginRight: 6, color: "#2563eb" }}
                    />
                    {instanceDetail.registradoPor ||
                      instanceDetail.startUserId ||
                      "sistema"}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>
                    {instanceDetail.startTime
                      ? dayjs(instanceDetail.startTime).format(
                          "DD/MM/YYYY HH:mm",
                        )
                      : "—"}
                  </Text>
                </Col>

                <Col xs={24} sm={8} md={6}>
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #dbeafe",
                      borderRadius: 8,
                      padding: "8px 12px",
                    }}
                  >
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: 0.4,
                      }}
                    >
                      Tiempo Total Transcurrido
                    </Text>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#2563eb",
                        marginTop: 2,
                      }}
                    >
                      <ClockCircleOutlined style={{ marginRight: 6 }} />
                      {formatDuration(
                        null,
                        instanceDetail.startTime,
                        instanceDetail.ended ? null : null,
                      )}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {instanceDetail.ended
                        ? "Trámite finalizado"
                        : "En curso continuo"}
                    </Text>
                  </div>
                </Col>
              </Row>
            ) : (
              <Alert
                type="warning"
                showIcon
                message="No se pudo cargar la información del trámite seleccionado"
              />
            )}
          </Card>

          {/* Contenido con Pestañas: Matriz / Árbol de Trazabilidad / Diagrama BPMN / Documentos */}
          <Card
            size="small"
            style={{
              borderRadius: 10,
              borderColor: "#e2e8f0",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "matrix",
                  label: (
                    <Space size="small">
                      <ApartmentOutlined style={{ color: "#2563eb" }} />
                      <span>Matriz Oficial PR-GAF-08</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: "8px 0" }}>
                      <PRGaf08MatrixViewer
                        instance={instanceDetail ?? null}
                        historicTasks={historicTasks}
                        variables={variables}
                      />
                    </div>
                  ),
                },
                {
                  key: "tree",
                  label: (
                    <Space size="small">
                      <HistoryOutlined />
                      <span>
                        Línea de Tiempo y Etapas ({historicTasks.length + 1})
                      </span>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: "12px 4px" }}>
                      {loadingHistory ? (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                          <Spin description="Construyendo línea cronológica de etapas..." />
                        </div>
                      ) : (
                        <Timeline
                          mode="left"
                          style={{ marginTop: 8 }}
                          items={[
                            // NODO 0: INICIO DEL TRÁMITE
                            {
                              color: "green",
                              dot: (
                                <div
                                  style={{
                                    backgroundColor: "#10b981",
                                    color: "#fff",
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 13,
                                    boxShadow:
                                      "0 0 0 4px rgba(16, 185, 129, 0.15)",
                                  }}
                                >
                                  <FileDoneOutlined />
                                </div>
                              ),
                              children: (
                                <Card
                                  size="small"
                                  style={{
                                    borderRadius: 10,
                                    border: "1px solid #bbf7d0",
                                    borderLeft: "4px solid #10b981",
                                    background: "#f0fdf4",
                                    marginBottom: 14,
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "flex-start",
                                      flexWrap: "wrap",
                                      gap: 6,
                                    }}
                                  >
                                    <div>
                                      <Tag
                                        color="success"
                                        bordered={false}
                                        style={{ fontSize: 11, margin: 0 }}
                                      >
                                        Hito Inicial
                                      </Tag>
                                      <div
                                        style={{
                                          fontSize: 14,
                                          fontWeight: 600,
                                          color: "#065f46",
                                          marginTop: 2,
                                        }}
                                      >
                                        Registro y Apertura del Expediente
                                      </div>
                                    </div>
                                    <Tag
                                      color="default"
                                      style={{
                                        fontSize: 11,
                                        borderRadius: 6,
                                        margin: 0,
                                      }}
                                    >
                                      <CalendarOutlined
                                        style={{ marginRight: 4 }}
                                      />
                                      {instanceDetail?.startTime
                                        ? dayjs(instanceDetail.startTime).format(
                                            "DD/MM/YYYY HH:mm:ss",
                                          )
                                        : "—"}
                                    </Tag>
                                  </div>

                                  <div style={{ marginTop: 8, fontSize: 12 }}>
                                    <Space size="large" wrap>
                                      <span>
                                        <Text type="secondary">
                                          Registrado por:
                                        </Text>{" "}
                                        <Text strong>
                                          @
                                          {instanceDetail?.registradoPor ||
                                            instanceDetail?.startUserId ||
                                            "usuario"}
                                        </Text>
                                      </span>
                                      <span>
                                        <Text type="secondary">
                                          Correlativo:
                                        </Text>{" "}
                                        <Text strong>
                                          {instanceDetail?.businessKey || "—"}
                                        </Text>
                                      </span>
                                    </Space>
                                  </div>
                                </Card>
                              ),
                            },

                            // NODOS 1..N: ETAPAS DEL PROCESO
                            ...historicTasks.map((task, idx) => {
                              const isFinished = Boolean(task.endTime);
                              const assignedConfig = task.taskDefinitionKey
                                ? taskAssignmentsMap.get(task.taskDefinitionKey)
                                : undefined;

                              // Calcular duración exacta de la tarea
                              const durationText = formatDuration(
                                task.durationInMillis,
                                task.startTime,
                                task.endTime,
                              );

                              return {
                                color: isFinished ? "green" : "blue",
                                dot: (
                                  <div
                                    style={{
                                      backgroundColor: isFinished
                                        ? "#10b981"
                                        : "#2563eb",
                                      color: "#fff",
                                      width: 26,
                                      height: 26,
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 13,
                                      boxShadow: isFinished
                                        ? "0 0 0 4px rgba(16, 185, 129, 0.12)"
                                        : "0 0 0 4px rgba(37, 99, 235, 0.18)",
                                    }}
                                  >
                                    {isFinished ? (
                                      <CheckCircleOutlined />
                                    ) : (
                                      <SyncOutlined spin />
                                    )}
                                  </div>
                                ),
                                children: (
                                  <Card
                                    size="small"
                                    style={{
                                      borderRadius: 10,
                                      border: `1px solid ${
                                        isFinished ? "#e2e8f0" : "#93c5fd"
                                      }`,
                                      borderLeft: `4px solid ${
                                        isFinished ? "#10b981" : "#2563eb"
                                      }`,
                                      background: isFinished
                                        ? "#ffffff"
                                        : "#f8fafc",
                                      marginBottom: 14,
                                      boxShadow: isFinished
                                        ? "0 1px 2px rgba(15, 23, 42, 0.03)"
                                        : "0 4px 12px rgba(37, 99, 235, 0.08)",
                                    }}
                                  >
                                    {/* Cabecera de la etapa */}
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        flexWrap: "wrap",
                                        gap: 8,
                                      }}
                                    >
                                      <div>
                                        <Space size={8} wrap align="center">
                                          <Tag
                                            color={
                                              isFinished ? "default" : "blue"
                                            }
                                            bordered={false}
                                            style={{
                                              margin: 0,
                                              fontWeight: 600,
                                              fontSize: 11,
                                            }}
                                          >
                                            Etapa {idx + 1}
                                          </Tag>
                                          <Text
                                            strong
                                            style={{
                                              fontSize: 14,
                                              color: "#0f172a",
                                            }}
                                          >
                                            {task.name ||
                                              task.taskDefinitionKey ||
                                              "Etapa de Revisión"}
                                          </Text>
                                          {isFinished ? (
                                            <Tag
                                              color="success"
                                              icon={<CheckCircleOutlined />}
                                              style={{
                                                fontSize: 11,
                                                margin: 0,
                                                borderRadius: 10,
                                              }}
                                            >
                                              Completada
                                            </Tag>
                                          ) : (
                                            <Tag
                                              color="processing"
                                              icon={<SyncOutlined spin />}
                                              style={{
                                                fontSize: 11,
                                                margin: 0,
                                                borderRadius: 10,
                                                fontWeight: 500,
                                              }}
                                            >
                                              En Curso (Activa ahora)
                                            </Tag>
                                          )}
                                        </Space>
                                        {task.taskDefinitionKey && (
                                          <div style={{ marginTop: 4 }}>
                                            <Text
                                              type="secondary"
                                              style={{
                                                fontFamily: "monospace",
                                                fontSize: 11,
                                              }}
                                            >
                                              Código BPMN:{" "}
                                              {task.taskDefinitionKey}
                                            </Text>
                                          </div>
                                        )}
                                      </div>

                                      {/* Permanencia / Tiempos */}
                                      <Tag
                                        color={isFinished ? "geekblue" : "orange"}
                                        style={{
                                          fontSize: 11.5,
                                          padding: "2px 8px",
                                          borderRadius: 6,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 5,
                                          margin: 0,
                                        }}
                                      >
                                        <ClockCircleOutlined />
                                        <span>
                                          {isFinished
                                            ? `Duración: ${durationText}`
                                            : `En espera: ${durationText}`}
                                        </span>
                                      </Tag>
                                    </div>

                                    {/* ¿Con quién estuvo / está? */}
                                    <div
                                      style={{
                                        marginTop: 10,
                                        padding: "8px 12px",
                                        backgroundColor: "#f8fafc",
                                        borderRadius: 8,
                                        border: "1px solid #e2e8f0",
                                        fontSize: 12,
                                      }}
                                    >
                                      <Row gutter={[16, 8]} align="middle">
                                        <Col xs={24} sm={12}>
                                          <Space size={6} wrap>
                                            <Text type="secondary">
                                              Responsable asignado:
                                            </Text>
                                            {task.assignee ? (
                                              <Tag
                                                color="blue"
                                                style={{
                                                  fontSize: 12,
                                                  margin: 0,
                                                  borderRadius: 6,
                                                }}
                                              >
                                                <UserOutlined
                                                  style={{ marginRight: 4 }}
                                                />
                                                @{task.assignee}
                                              </Tag>
                                            ) : (
                                              <Tag
                                                color="default"
                                                bordered={false}
                                                style={{
                                                  fontSize: 11.5,
                                                  margin: 0,
                                                }}
                                              >
                                                Pendiente de atención por el rol
                                              </Tag>
                                            )}
                                          </Space>
                                        </Col>

                                        {assignedConfig?.candidateGroups &&
                                          assignedConfig.candidateGroups
                                            .length > 0 && (
                                            <Col xs={24} sm={12}>
                                              <Space size={6} wrap>
                                                <Text type="secondary">
                                                  Roles autorizados:
                                                </Text>
                                                {assignedConfig.candidateGroups.map(
                                                  (g) => (
                                                    <Tag
                                                      key={g}
                                                      color="purple"
                                                      bordered={false}
                                                      style={{
                                                        fontSize: 11,
                                                        margin: 0,
                                                      }}
                                                    >
                                                      <TeamOutlined
                                                        style={{
                                                          marginRight: 4,
                                                        }}
                                                      />
                                                      {g}
                                                    </Tag>
                                                  ),
                                                )}
                                              </Space>
                                            </Col>
                                          )}
                                      </Row>
                                    </div>

                                    {/* Fechas de Entrada y Salida */}
                                    <div
                                      style={{
                                        marginTop: 8,
                                        fontSize: 11.5,
                                        color: "#64748b",
                                        display: "flex",
                                        gap: 20,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span>
                                        <strong>Inicio de etapa:</strong>{" "}
                                        {dayjs(task.startTime).format(
                                          "DD/MM/YYYY HH:mm:ss",
                                        )}
                                      </span>
                                      <span>
                                        <strong>Conclusión:</strong>{" "}
                                        {task.endTime
                                          ? dayjs(task.endTime).format(
                                              "DD/MM/YYYY HH:mm:ss",
                                            )
                                          : "En atención actualmente"}
                                      </span>
                                    </div>
                                  </Card>
                                ),
                              };
                            }),
                          ]}
                        />
                      )}
                    </div>
                  ),
                },
                {
                  key: "diagram",
                  label: (
                    <Space size="small">
                      <PictureOutlined />
                      <span>Diagrama BPMN en Vivo</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: "12px 0", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12.5 }}>
                          Diagrama oficial del flujo con la etapa actual resaltada en tiempo real:
                        </Text>
                        <Button
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={() => refetchDiagram()}
                        >
                          Actualizar diagrama
                        </Button>
                      </div>

                      {loadingDiagram && (
                        <div style={{ padding: "40px 0" }}>
                          <Spin description="Renderizando diagrama BPMN..." />
                        </div>
                      )}

                      {isDiagramError && (
                        <Alert
                          type="warning"
                          showIcon
                          message="Diagrama no disponible"
                          description="El motor no generó el diagrama para esta instancia (posiblemente ya concluida o sin coordenadas DI)."
                        />
                      )}

                      {!loadingDiagram && !isDiagramError && diagramUrl && (
                        <Card
                          size="small"
                          style={{
                            background: "#f8fafc",
                            borderRadius: 8,
                            overflowX: "auto",
                            textAlign: "center",
                          }}
                        >
                          <Image
                            src={diagramUrl}
                            alt="Avance en Diagrama BPMN"
                            style={{ maxWidth: "100%", height: "auto" }}
                            preview={{ mask: "Click para ampliar diagrama" }}
                          />
                        </Card>
                      )}
                    </div>
                  ),
                },
                {
                  key: "docs",
                  label: (
                    <Space size="small">
                      <FolderOpenOutlined />
                      <span>Expediente de Documentos y Datos</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: "12px 0" }}>
                      {loadingVars ? (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                          <Spin description="Consultando antecedentes y documentos adjuntos..." />
                        </div>
                      ) : (
                        <TaskAntecedentsViewer
                          variables={variables}
                          defaultExpanded={true}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

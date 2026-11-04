import {
  ApartmentOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  PictureOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Timeline,
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

export function ProcessTrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProcessKey = searchParams.get("processKey") || undefined;
  const initialInstanceId = searchParams.get("instanceId") || null;

  // Catálogo de definiciones y procesos
  const { data: definitionsPage, isLoading: loadingDefs } = useDefinitionsQuery(
    { size: 100 },
  );
  const { data: availableProcesses } = useAvailableProcessesQuery();

  // Deduplicar procesos por clave tomando la versión más reciente
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

  // Proceso seleccionado (Criterio Principal de Búsqueda)
  const [selectedProcessKey, setSelectedProcessKey] = useState<
    string | undefined
  >(initialProcessKey);

  const activeProcessKey = selectedProcessKey ?? uniqueProcesses[0]?.key;

  // Instancia / Trámite actualmente seleccionado para consulta detallada
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    initialInstanceId,
  );

  // Buscador de trámites por texto
  const [searchQuery, setSearchQuery] = useState("");

  // Pestaña activa del expediente
  const [activeTab, setActiveTab] = useState<string>("matrix");

  // Query de instancias del tipo de proceso seleccionado
  const {
    data: instancesData,
    isLoading: loadingInstances,
    refetch: refetchInstances,
  } = useInstancesQuery({
    processDefinitionKey: activeProcessKey,
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
    activeProcessKey,
    Boolean(activeProcessKey),
  );

  const taskAssignmentsMap = useMemo(() => {
    return new Map(
      (configuredAssignments ?? []).map((a) => [a.taskDefinitionKey, a]),
    );
  }, [configuredAssignments]);

  // Filtrado de trámites en la lista rápida
  const filteredInstances = useMemo(() => {
    const list = instancesData?.data ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (inst) =>
        inst.businessKey?.toLowerCase().includes(q) ||
        inst.id.toLowerCase().includes(q) ||
        inst.startUserId?.toLowerCase().includes(q) ||
        inst.registradoPor?.toLowerCase().includes(q),
    );
  }, [instancesData, searchQuery]);

  // Manejar cambio de proceso
  const handleProcessChange = (procKey: string) => {
    setSelectedProcessKey(procKey);
    setSelectedInstanceId(null);
    setSearchParams({ processKey: procKey });
  };

  // Manejar selección de trámite
  const handleSelectInstance = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setSearchParams({
      processKey: activeProcessKey ?? "",
      instanceId,
    });
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

  // Columnas para la tabla de trámites cuando no hay uno seleccionado
  const instanceColumns: ColumnsType<ProcessInstance> = [
    {
      title: "Trámite / Correlativo",
      dataIndex: "businessKey",
      key: "businessKey",
      render: (businessKey: string | null, record) => (
        <Space size="small">
          <FileTextOutlined style={{ color: "#3b82f6" }} />
          <div>
            <Text
              strong
              style={{ color: "#2563eb", cursor: "pointer" }}
              onClick={() => handleSelectInstance(record.id)}
            >
              {businessKey || record.id.substring(0, 12)}
            </Text>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              ID: {record.id.substring(0, 18)}...
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Ubicación / Etapa Actual",
      dataIndex: "activityId",
      key: "activityId",
      render: (activityId: string | null, record) => {
        if (record.ended) {
          return <Tag color="success">Concluido / Finalizado</Tag>;
        }
        const act = formatActivityName(activityId);
        return (
          <Tag color="processing" icon={<SyncOutlined spin />}>
            {act.label}
          </Tag>
        );
      },
    },
    {
      title: "Iniciado Por",
      key: "starter",
      render: (_, record) => {
        const starter = record.registradoPor || record.startUserId;
        return starter ? (
          <Space size={4}>
            <UserOutlined style={{ color: "#64748b", fontSize: 12 }} />
            <Text style={{ fontSize: 12 }}>@{starter}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
    },
    {
      title: "Fecha de Inicio",
      dataIndex: "startTime",
      key: "startTime",
      render: (startTime?: string | null) =>
        startTime ? (
          <Space size={4} style={{ fontSize: 12 }}>
            <ClockCircleOutlined style={{ color: "#94a3b8" }} />
            <span>{dayjs(startTime).format("DD/MM/YYYY HH:mm")}</span>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Tiempo Transcurrido",
      key: "duration",
      render: (_, record) => (
        <Tag color="blue" style={{ fontSize: 11 }}>
          {formatDuration(null, record.startTime, record.ended ? null : null)}
        </Tag>
      ),
    },
    {
      title: "Acción",
      key: "action",
      align: "center",
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleSelectInstance(record.id)}
        >
          Ver Trazabilidad
        </Button>
      ),
    },
  ];

  // Datos amigables del trámite seleccionado
  const friendlyProcessName = getProcessFriendlyName(
    instanceDetail?.processDefinitionId || activeProcessKey,
    definitionsPage?.data,
    availableProcesses,
  );

  const currentActivity = instanceDetail
    ? formatActivityName(instanceDetail.activityId)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Cabecera Principal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title
            level={4}
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 18,
            }}
          >
            <FileSearchOutlined style={{ color: "#2563eb" }} />
            Consulta y Trazabilidad de Trámites
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Consulta la ruta, evaluadores responsables, tiempos de permanencia en cada etapa y documentos adjuntos.
          </Text>
        </div>

        <Button
          size="small"
          icon={<ReloadOutlined spin={loadingInstances || loadingHistory} />}
          onClick={handleRefresh}
        >
          Actualizar
        </Button>
      </div>

      {/* Barra de Filtro Principal: CRITERIO POR TIPO DE TRÁMITE / PROCESO */}
      <Card
        size="small"
        styles={{ body: { padding: "10px 14px" } }}
        style={{
          borderRadius: 8,
          borderColor: "#e2e8f0",
          background: "#ffffff",
        }}
      >
        <Row gutter={[12, 10]} align="middle">
          <Col xs={24} md={12} lg={10}>
            <Space size="small" style={{ width: "100%" }}>
              <ApartmentOutlined style={{ color: "#3b82f6", fontSize: 15 }} />
              <Text strong style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                Tipo de Trámite:
              </Text>
              <Select
                size="small"
                loading={loadingDefs}
                placeholder="Seleccionar proceso..."
                value={activeProcessKey}
                onChange={handleProcessChange}
                style={{ width: "100%", minWidth: 260 }}
                showSearch
                optionFilterProp="label"
                options={uniqueProcesses.map((p) => ({
                  value: p.key,
                  label: `${p.name} (${p.key} - v${p.version})`,
                }))}
              />
            </Space>
          </Col>

          <Col xs={24} md={12} lg={8}>
            <Input
              size="small"
              placeholder="Buscar por correlativo, ID o solicitante..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              allowClear
            />
          </Col>

          <Col xs={24} lg={6} style={{ textAlign: "right" }}>
            <Tag color="geekblue" style={{ fontSize: 12, padding: "2px 8px" }}>
              {filteredInstances.length}{" "}
              {filteredInstances.length === 1 ? "trámite" : "trámites"} registrados
            </Tag>
          </Col>
        </Row>
      </Card>

      {/* VISTA 1: CUANDO NO SE HA SELECCIONADO UN TRÁMITE (TABLA DE EXPEDIENTES) */}
      {!selectedInstanceId && (
        <Card
          size="small"
          styles={{ body: { padding: 0 } }}
          style={{
            borderRadius: 8,
            borderColor: "#e2e8f0",
            overflow: "hidden",
          }}
        >
          <Table<ProcessInstance>
            rowKey="id"
            size="small"
            columns={instanceColumns}
            dataSource={filteredInstances}
            loading={loadingInstances}
            pagination={{ pageSize: 12, showSizeChanger: false }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    searchQuery
                      ? `No se encontraron trámites con "${searchQuery}".`
                      : "No hay trámites registrados para este tipo de proceso."
                  }
                />
              ),
            }}
          />
        </Card>
      )}

      {/* VISTA 2: EXPEDIENTE Y ÁRBOL DE TRAZABILIDAD DEL TRÁMITE SELECCIONADO */}
      {selectedInstanceId && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Botón para volver al listado */}
          <div>
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => setSelectedInstanceId(null)}
            >
              Volver a la lista de trámites
            </Button>
          </div>

          {/* Tarjeta Ejecutiva de Resumen del Trámite */}
          <Card
            size="small"
            styles={{ body: { padding: "12px 16px" } }}
            style={{
              borderRadius: 8,
              border: "1px solid #bfdbfe",
              background: "#f0f7ff",
            }}
          >
            {loadingDetail ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Spin description="Cargando expediente del trámite..." />
              </div>
            ) : instanceDetail ? (
              <Row gutter={[16, 12]} align="middle">
                <Col xs={24} md={8}>
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, textTransform: "uppercase" }}
                  >
                    Expediente / Correlativo
                  </Text>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1e3a8a" }}>
                    {instanceDetail.businessKey || instanceDetail.id}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {friendlyProcessName}
                  </Text>
                </Col>

                <Col xs={12} sm={6} md={5}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    ¿Dónde está ahora?
                  </Text>
                  <div>
                    {instanceDetail.ended ? (
                      <Tag color="success" style={{ fontSize: 12, marginTop: 2 }}>
                        🟢 Concluido con éxito
                      </Tag>
                    ) : (
                      <Tag
                        color="processing"
                        icon={<SyncOutlined spin />}
                        style={{ fontSize: 12, marginTop: 2 }}
                      >
                        {currentActivity?.label ?? "En revisión"}
                      </Tag>
                    )}
                  </div>
                </Col>

                <Col xs={12} sm={6} md={5}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Solicitado por
                  </Text>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                    <UserOutlined style={{ marginRight: 4, color: "#3b82f6" }} />
                    @{instanceDetail.registradoPor || instanceDetail.startUserId || "sistema"}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {instanceDetail.startTime
                      ? dayjs(instanceDetail.startTime).format("DD/MM/YYYY HH:mm")
                      : "—"}
                  </Text>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Tiempo Total Acumulado
                  </Text>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#2563eb", marginTop: 2 }}>
                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                    {formatDuration(null, instanceDetail.startTime, instanceDetail.ended ? null : null)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {instanceDetail.ended ? "Trámite finalizado" : "En curso continuo"}
                  </Text>
                </Col>
              </Row>
            ) : (
              <Alert
                type="warning"
                message="No se pudo cargar la información del trámite seleccionado"
              />
            )}
          </Card>

          {/* Contenido con Pestañas: Árbol de Trazabilidad / Diagrama BPMN / Documentos */}
          <Card
            size="small"
            style={{
              borderRadius: 8,
              borderColor: "#e2e8f0",
              background: "#ffffff",
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
                      <span>Árbol de Trazabilidad y Etapas ({historicTasks.length + 1})</span>
                    </Space>
                  ),
                  children: (
                    <div style={{ padding: "8px 0" }}>
                      {loadingHistory ? (
                        <div style={{ textAlign: "center", padding: "40px 0" }}>
                          <Spin description="Construyendo árbol cronológico de etapas..." />
                        </div>
                      ) : (
                        <Timeline
                          mode="left"
                          style={{ marginTop: 12 }}
                          items={[
                            // NODO 0: INICIO DEL TRÁMITE
                            {
                              color: "green",
                              dot: (
                                <div
                                  style={{
                                    backgroundColor: "#10b981",
                                    color: "#fff",
                                    width: 24,
                                    height: 24,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 12,
                                  }}
                                >
                                  <FileDoneOutlined />
                                </div>
                              ),
                              children: (
                                <Card
                                  size="small"
                                  style={{
                                    borderRadius: 8,
                                    border: "1px solid #d1fae5",
                                    background: "#f0fdf4",
                                    marginBottom: 16,
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
                                      <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                                        Inicio de Solicitud
                                      </Tag>
                                      <div
                                        style={{
                                          fontSize: 14,
                                          fontWeight: 600,
                                          color: "#065f46",
                                          marginTop: 2,
                                        }}
                                      >
                                        Registro y Envío del Trámite
                                      </div>
                                    </div>
                                    <Tag color="default" style={{ fontSize: 11 }}>
                                      {instanceDetail?.startTime
                                        ? dayjs(instanceDetail.startTime).format("DD/MM/YYYY HH:mm:ss")
                                        : "—"}
                                    </Tag>
                                  </div>

                                  <div style={{ marginTop: 6, fontSize: 12 }}>
                                    <Space size="middle" wrap>
                                      <span>
                                        <strong>Iniciado por:</strong> @
                                        {instanceDetail?.registradoPor ||
                                          instanceDetail?.startUserId ||
                                          "usuario"}
                                      </span>
                                      <span>
                                        <strong>Correlativo:</strong>{" "}
                                        {instanceDetail?.businessKey || "—"}
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
                                      backgroundColor: isFinished ? "#10b981" : "#2563eb",
                                      color: "#fff",
                                      width: 24,
                                      height: 24,
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 12,
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
                                      borderRadius: 8,
                                      border: `1px solid ${
                                        isFinished ? "#e2e8f0" : "#93c5fd"
                                      }`,
                                      background: isFinished ? "#ffffff" : "#f8fafc",
                                      marginBottom: 16,
                                      boxShadow: isFinished
                                        ? "none"
                                        : "0 2px 8px rgba(37,99,235,0.08)",
                                    }}
                                  >
                                    {/* Cabecera de la etapa */}
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
                                        <Space size={6} wrap>
                                          <Text strong style={{ fontSize: 14 }}>
                                            {idx + 1}. {task.name || task.taskDefinitionKey || "Etapa"}
                                          </Text>
                                          {isFinished ? (
                                            <Tag color="success" style={{ fontSize: 11, margin: 0 }}>
                                              Completada
                                            </Tag>
                                          ) : (
                                            <Tag
                                              color="processing"
                                              icon={<SyncOutlined spin />}
                                              style={{ fontSize: 11, margin: 0 }}
                                            >
                                              🔵 EN CURSO (Activa ahora)
                                            </Tag>
                                          )}
                                        </Space>
                                        <div style={{ marginTop: 2 }}>
                                          <Tag
                                            color="geekblue"
                                            style={{
                                              fontFamily: "monospace",
                                              fontSize: 10,
                                              margin: 0,
                                            }}
                                          >
                                            {task.taskDefinitionKey}
                                          </Tag>
                                        </div>
                                      </div>

                                      {/* Permanencia / Tiempos */}
                                      <Tag
                                        color={isFinished ? "blue" : "orange"}
                                        style={{
                                          fontSize: 11,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                        }}
                                      >
                                        <ClockCircleOutlined />
                                        <span>
                                          {isFinished
                                            ? `Estuvo: ${durationText}`
                                            : `Lleva en esta etapa: ${durationText}`}
                                        </span>
                                      </Tag>
                                    </div>

                                    {/* ¿Con quién estuvo / está? */}
                                    <div
                                      style={{
                                        marginTop: 8,
                                        padding: "6px 10px",
                                        backgroundColor: "#f8fafc",
                                        borderRadius: 6,
                                        border: "1px solid #f1f5f9",
                                        fontSize: 12,
                                      }}
                                    >
                                      <Row gutter={[12, 6]}>
                                        <Col xs={24} sm={12}>
                                          <Text type="secondary">Responsable directo:</Text>{" "}
                                          {task.assignee ? (
                                            <Tag color="geekblue" style={{ fontSize: 12 }}>
                                              <UserOutlined style={{ marginRight: 4 }} />
                                              @{task.assignee}
                                            </Tag>
                                          ) : (
                                            <Text type="secondary" italic>
                                              (Pendiente de reclamo)
                                            </Text>
                                          )}
                                        </Col>

                                        {assignedConfig?.candidateGroups &&
                                          assignedConfig.candidateGroups.length > 0 && (
                                            <Col xs={24} sm={12}>
                                              <Text type="secondary">Roles / Grupos autorizados:</Text>{" "}
                                              <Space size={4} wrap>
                                                {assignedConfig.candidateGroups.map((g) => (
                                                  <Tag
                                                    key={g}
                                                    color="purple"
                                                    style={{ fontSize: 11, margin: 0 }}
                                                  >
                                                    <TeamOutlined style={{ marginRight: 2 }} />
                                                    {g}
                                                  </Tag>
                                                ))}
                                              </Space>
                                            </Col>
                                          )}
                                      </Row>
                                    </div>

                                    {/* Fechas de Entrada y Salida */}
                                    <div
                                      style={{
                                        marginTop: 8,
                                        fontSize: 11,
                                        color: "#64748b",
                                        display: "flex",
                                        gap: 16,
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <span>
                                        <strong>Entrada:</strong>{" "}
                                        {dayjs(task.startTime).format("DD/MM/YYYY HH:mm:ss")}
                                      </span>
                                      <span>
                                        <strong>Salida / Conclusión:</strong>{" "}
                                        {task.endTime
                                          ? dayjs(task.endTime).format("DD/MM/YYYY HH:mm:ss")
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
                        }}
                      >
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Ruta oficial del proceso con la etapa actual coloreada en tiempo real:
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
                            overflowX: "auto",
                            textAlign: "center",
                          }}
                        >
                          <Image
                            src={diagramUrl}
                            alt="Avance en Diagrama BPMN"
                            style={{ maxWidth: "100%", height: "auto" }}
                            preview={{ mask: "Click para ampliar" }}
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

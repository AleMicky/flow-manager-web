import {
  ApartmentOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Input,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import { useState } from "react";
import { BpmnXmlModal } from "../components/BpmnXmlModal";
import { DeployBpmnModal } from "../components/DeployBpmnModal";
import { ProcessVersionsDrawer } from "../components/ProcessVersionsDrawer";
import { useDefinitionsQuery } from "../hooks/useDefinitionsQueries";
import type { ProcessDefinition } from "../types/definitions.types";
import { useAuthStore } from "../../../stores/auth.store";
import { StartProcessModal } from "../../instances/components/StartProcessModal";

const { Title, Paragraph, Text } = Typography;

export function DefinitionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modals state
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [xmlModal, setXmlModal] = useState<{
    open: boolean;
    definitionId: string | null;
    processName?: string;
  }>({
    open: false,
    definitionId: null,
  });
  const [versionsDrawer, setVersionsDrawer] = useState<{
    open: boolean;
    processKey: string | null;
    processName?: string;
  }>({
    open: false,
    processKey: null,
  });
  const [startInstanceModal, setStartInstanceModal] = useState<{
    open: boolean;
    processKey?: string;
  }>({
    open: false,
  });

  const queryParams = {
    start: (page - 1) * pageSize,
    size: pageSize,
    ...(debouncedSearch
      ? { name: debouncedSearch, key: debouncedSearch }
      : {}),
  };

  const { data, isLoading, refetch, isFetching } =
    useDefinitionsQuery(queryParams);

  const handleSearch = () => {
    setPage(1);
    setDebouncedSearch(searchTerm.trim());
  };

  const handleResetSearch = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setPage(1);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) {
      setPage(pagination.current);
    }
    if (pagination.pageSize) {
      setPageSize(pagination.pageSize);
    }
  };

  const columns: ColumnsType<ProcessDefinition> = [
    {
      title: "Proceso",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <Text strong style={{ fontSize: 14 }}>
            {name || record.key}
          </Text>
          {record.description && (
            <Paragraph
              type="secondary"
              ellipsis={{ rows: 1 }}
              style={{ margin: 0, fontSize: 12 }}
            >
              {record.description}
            </Paragraph>
          )}
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Recurso: {record.resource}
          </div>
        </div>
      ),
    },
    {
      title: "Clave (Key)",
      dataIndex: "key",
      key: "key",
      width: 180,
      render: (key: string) => <Tag color="geekblue">{key}</Tag>,
    },
    {
      title: "Versión",
      dataIndex: "version",
      key: "version",
      width: 100,
      align: "center",
      render: (version: number) => <Tag color="purple">v{version}</Tag>,
    },
    {
      title: "Estado",
      dataIndex: "suspended",
      key: "suspended",
      width: 120,
      render: (suspended: boolean) =>
        suspended ? (
          <Badge status="error" text="Suspendido" />
        ) : (
          <Badge status="success" text="Activo" />
        ),
    },
    {
      title: "Deployment ID",
      dataIndex: "deploymentId",
      key: "deploymentId",
      width: 160,
      ellipsis: true,
      render: (id: string) => (
        <Text type="secondary" copyable={{ text: id }}>
          {id}
        </Text>
      ),
    },
    {
      title: "Acciones",
      key: "actions",
      width: 230,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Iniciar nueva instancia de este proceso">
            <Button
              type="text"
              size="small"
              style={{ color: "#10b981" }}
              icon={<PlayCircleOutlined />}
              onClick={() =>
                setStartInstanceModal({
                  open: true,
                  processKey: record.key,
                })
              }
            >
              Iniciar
            </Button>
          </Tooltip>

          <Tooltip title="Ver y descargar XML BPMN">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() =>
                setXmlModal({
                  open: true,
                  definitionId: record.id,
                  processName: record.name || record.key,
                })
              }
            >
              XML
            </Button>
          </Tooltip>

          <Tooltip title="Consultar versiones anteriores">
            <Button
              type="text"
              size="small"
              icon={<HistoryOutlined />}
              onClick={() =>
                setVersionsDrawer({
                  open: true,
                  processKey: record.key,
                  processName: record.name || record.key,
                })
              }
            >
              Versiones
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const user = useAuthStore((s) => s.user);
  const canDeploy = Boolean(
    user?.roles?.some((r) =>
      ["workflow-admin", "workflow-designer"].includes(r),
    ),
  );

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
            <ApartmentOutlined style={{ marginRight: 8, color: "#3b82f6" }} />
            Definiciones de Procesos BPMN
          </Title>
          <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
            Catálogo de diagramas y flujos de trabajo publicados en el motor Flowable.
          </Paragraph>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined spin={isFetching} />}
            onClick={() => refetch()}
          >
            Actualizar
          </Button>
          <Tooltip
            title={
              !canDeploy
                ? "Requiere rol workflow-admin o workflow-designer para publicar"
                : undefined
            }
          >
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={() => setDeployModalOpen(true)}
              disabled={!canDeploy}
            >
              Publicar Proceso
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <Card size="small">
        <Space wrap style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap>
            <Input
              placeholder="Buscar por nombre o clave..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 280 }}
              allowClear
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            />
            <Button type="primary" onClick={handleSearch}>
              Buscar
            </Button>
            {debouncedSearch && (
              <Button onClick={handleResetSearch}>Limpiar filtro</Button>
            )}
          </Space>

          <Text type="secondary" style={{ fontSize: 13 }}>
            Total registrados: <Text strong>{data?.total ?? 0}</Text>
          </Text>
        </Space>
      </Card>

      {/* Tabla Principal */}
      <Card styles={{ body: { padding: 0 } }} style={{ overflow: "hidden" }}>
        <Table<ProcessDefinition>
          rowKey="id"
          columns={columns}
          dataSource={data?.data ?? []}
          loading={isLoading}
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: ["10", "20", "50"],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} procesos`,
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Modal para publicar BPMN */}
      <DeployBpmnModal
        open={deployModalOpen}
        onClose={() => setDeployModalOpen(false)}
        onSuccess={() => refetch()}
      />

      {/* Modal para visualizar y descargar XML */}
      <BpmnXmlModal
        open={xmlModal.open}
        definitionId={xmlModal.definitionId}
        processName={xmlModal.processName}
        onClose={() =>
          setXmlModal({ open: false, definitionId: null })
        }
      />

      {/* Drawer para consultar historial de versiones */}
      <ProcessVersionsDrawer
        open={versionsDrawer.open}
        processKey={versionsDrawer.processKey}
        processName={versionsDrawer.processName}
        onClose={() =>
          setVersionsDrawer({ open: false, processKey: null })
        }
        onViewXml={(defId) =>
          setXmlModal({
            open: true,
            definitionId: defId,
            processName: versionsDrawer.processName,
          })
        }
      />

      {/* Modal para iniciar proceso */}
      <StartProcessModal
        open={startInstanceModal.open}
        initialProcessKey={startInstanceModal.processKey}
        onClose={() =>
          setStartInstanceModal({ open: false, processKey: undefined })
        }
      />
    </div>
  );
}

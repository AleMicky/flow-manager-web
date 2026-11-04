import {
  ApartmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MailOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Alert, Card, Col, Row, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo } from "react";
import type { ProcessInstance } from "../types/instances.types";

const { Title, Text } = Typography;

export interface PRGaf08MatrixViewerProps {
  instance?: ProcessInstance | null;
  historicTasks?: Array<{
    id: string;
    taskDefinitionKey?: string | null;
    name?: string | null;
    assignee?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    durationInMillis?: number | null;
  }>;
  variables?: Record<string, unknown>;
}

type PhaseStatus = "PENDING" | "APPROVED" | "REJECTED" | "OBSERVED" | "IN_PROGRESS";

interface PhaseDefinition {
  num: string;
  name: string;
  responsible: string;
  type: "Secuencial" | "Simultáneo";
  possibleStates: string;
  advanceCondition: string;
  emailNotification: string;
  actionOnReject: string;
  status: PhaseStatus;
  statusLabel: string;
  assignee?: string;
  completedAt?: string;
  details?: string;
}

export function PRGaf08MatrixViewer({
  instance,
  historicTasks = [],
  variables = {},
}: PRGaf08MatrixViewerProps) {
  // 1. Determinar Categoría y Responsable de Contratación según PR-GAF-08
  const rawCat = String(variables?.categoria || "CATEGORIA_I").toUpperCase();
  const montoBs = Number(variables?.montoEstimadoBs || variables?.montoTotal || 0);
  const correlativoCode = instance?.businessKey || variables?.correlativo || variables?.codigoTramite;

  const isCat1 =
    rawCat === "CATEGORIA_I" || (!variables?.categoria && montoBs <= 150000);
  const isCat2 = rawCat === "CATEGORIA_II";
  const isCat3 = rawCat === "CATEGORIA_III";
  const isCatSpecial = rawCat === "CATEGORIA_ESPECIAL";

  const categoryTitle = isCat1
    ? "CATEGORÍA I (Hasta Bs. 150.000 - Fondos / Caja Chica)"
    : isCat2
      ? "CATEGORÍA II (Bs. 150.001 hasta Bs. 14.000.000)"
      : isCat3
        ? "CATEGORÍA III (Mayor a Bs. 14.000.001)"
        : isCatSpecial
          ? "CATEGORÍA ESPECIAL (Sin límite de monto - Excepcional)"
          : "CATEGORÍA I (Hasta Bs. 150.000)";

  const contratacionResponsible = isCat1
    ? "Gerente de Área"
    : "Gerente General";

  // Mapear historial de tareas completadas o activas
  const taskMap = useMemo(() => {
    const map = new Map<string, { isFinished: boolean; assignee?: string; endTime?: string }>();
    for (const t of historicTasks) {
      if (t.taskDefinitionKey) {
        map.set(t.taskDefinitionKey, {
          isFinished: Boolean(t.endTime),
          assignee: t.assignee || undefined,
          endTime: t.endTime || undefined,
        });
      }
    }
    return map;
  }, [historicTasks]);

  // Evaluador de estado por fase
  const getPhaseStatus = (
    taskKey: string,
    approvedVal?: unknown,
  ): { status: PhaseStatus; label: string } => {
    const taskInfo = taskMap.get(taskKey);

    if (!taskInfo) {
      return { status: "PENDING", label: "Pendiente" };
    }

    if (!taskInfo.isFinished) {
      return { status: "IN_PROGRESS", label: "En Curso" };
    }

    if (approvedVal === false) {
      return { status: "REJECTED", label: "Rechazado / Observado" };
    }

    if (approvedVal === true || approvedVal === "APROBADO") {
      return { status: "APPROVED", label: "Aprobado" };
    }

    if (approvedVal === "OBSERVADO") {
      return { status: "OBSERVED", label: "Observado" };
    }

    if (approvedVal === "RECHAZADO") {
      return { status: "REJECTED", label: "Rechazado" };
    }

    return { status: "APPROVED", label: "Aprobado / Conforme" };
  };

  // 2. Construcción de Fases según Categoría
  const phases: PhaseDefinition[] = useMemo(() => {
    if (isCat1) {
      const verifAlm = getPhaseStatus("taskVerificarExistencias", variables?.aprobadoAlmacenes);
      const verifPre = getPhaseStatus("taskVerificarPresupuesto", variables?.aprobadoPresupuesto);
      const asig = getPhaseStatus("taskAsignarEncargado");
      const rev = getPhaseStatus("taskRevisarSolicitud");
      const sup = getPhaseStatus("taskAprobacionSuperior", variables?.aprobadoSuperior);
      const gaf = getPhaseStatus("taskGafCat1", variables?.aprobadoGaf);
      const dec = getPhaseStatus("taskDecisionFinalCat1", variables?.decisionFinal);

      return [
        {
          num: "1",
          name: "Inicio de la solicitud de adquisiciones",
          responsible: "Unidad Solicitante",
          type: "Secuencial",
          possibleStates: "Inicio de Proceso",
          advanceCondition: "Adjuntar ET's o TDR's y Cotización",
          emailNotification:
            "Notifica por email simultáneamente a Existencias y Presupuestos.",
          actionOnReject: "—",
          status: "APPROVED",
          statusLabel: "Iniciado / Creado",
          assignee: String(variables?.iniciador || variables?.solicitante || "Solicitante"),
        },
        {
          num: "2.1",
          name: "Verificación de existencias / activos",
          responsible: "Encargado de Activos Fijos / Almacenes",
          type: "Simultáneo",
          possibleStates: "Aprobar / Rechazar",
          advanceCondition:
            "Confirma existencias o activos. Avanza cuando ESTE y Presupuestos aprueban.",
          emailNotification:
            "Al aprobar ambos VoBo: correo automático a Unidad de Adquisiciones.",
          actionOnReject: "Si Rechaza: notifica al Solicitante; retorna para ajuste.",
          status: verifAlm.status,
          statusLabel: verifAlm.label,
          assignee: taskMap.get("taskVerificarExistencias")?.assignee,
          details: String(variables?.obsAlmacenes || ""),
        },
        {
          num: "2.2",
          name: "Verificación de presupuesto",
          responsible: "Encargado de Presupuestos",
          type: "Simultáneo",
          possibleStates: "Aprobar / Rechazar",
          advanceCondition:
            "Confirma disponibilidad presupuestaria. Avanza cuando ESTE y Almacenes aprueban.",
          emailNotification: "Sincronizado con Almacenes / Activos Fijos.",
          actionOnReject: "Si Rechaza: notifica al Solicitante; se devuelve para ajuste.",
          status: verifPre.status,
          statusLabel: verifPre.label,
          assignee: taskMap.get("taskVerificarPresupuesto")?.assignee,
          details: String(variables?.obsPresupuesto || ""),
        },
        {
          num: "3",
          name: "Asignación Encargado de Adquisiciones",
          responsible: "Jefatura de Adquisiciones",
          type: "Secuencial",
          possibleStates: "Asignación del proceso",
          advanceCondition: "Asignación formal de la solicitud al Encargado de Contratación.",
          emailNotification: "Encargado de Contratación Asignado: notificado por email.",
          actionOnReject: "—",
          status: asig.status,
          statusLabel: asig.label,
          assignee: taskMap.get("taskAsignarEncargado")?.assignee,
          details: variables?.encargadoContratacionUserId
            ? `Asignado a: @${variables.encargadoContratacionUserId}`
            : undefined,
        },
        {
          num: "4",
          name: "Revisión solicitud de adquisición",
          responsible: "Encargado de Contratación",
          type: "Secuencial",
          possibleStates: "Revisión del Proceso",
          advanceCondition:
            "Adjuntar PDFs firmados, ET/TDR, cotizaciones, anexos y verificar Bien o Servicio.",
          emailNotification:
            "Remite al Inmediato Superior para su aprobación/rechazo se notifica por email.",
          actionOnReject:
            "Si Rechaza: notifica al Solicitante; se devuelve para subsanar o se detiene.",
          status: rev.status,
          statusLabel: rev.label,
          assignee: taskMap.get("taskRevisarSolicitud")?.assignee,
        },
        {
          num: "5",
          name: "Aprobación Inmediato Superior",
          responsible: "Jefe Inmediato Superior - Unidad Solicitante",
          type: "Secuencial",
          possibleStates: "Aprobar / Rechazar",
          advanceCondition: "VoBo jerárquico de la unidad solicitante.",
          emailNotification: "Notificado al emitir visto bueno.",
          actionOnReject:
            "Si Rechaza: notifica al Solicitante y a Adquisiciones; devuelve para ajuste o cancela.",
          status: sup.status,
          statusLabel: sup.label,
          assignee: taskMap.get("taskAprobacionSuperior")?.assignee,
          details: String(variables?.obsSuperior || ""),
        },
        {
          num: "6",
          name: "Aprobación GAF",
          responsible: "Gerencia Administrativa Financiera",
          type: "Secuencial",
          possibleStates: "Aprobar / Rechazar",
          advanceCondition: "Revisión y visto bueno de GAF.",
          emailNotification: "Notifica al Responsable de Contratación para decisión final.",
          actionOnReject:
            "Si Rechaza: notifica al Solicitante y a Adquisiciones; devuelve para ajuste o cancela.",
          status: gaf.status,
          statusLabel: gaf.label,
          assignee: taskMap.get("taskGafCat1")?.assignee,
          details: String(variables?.obsGaf || ""),
        },
        {
          num: "7",
          name: "Decisión final",
          responsible: "Responsable de Contratación (Gerente de Área)",
          type: "Secuencial",
          possibleStates: "Observado / Aprobado / Rechazado",
          advanceCondition:
            "Resolución definitiva tras los vistos buenos conforme al Anexo II PR-GAF-08.",
          emailNotification:
            "Observado: notifica a Solicitante y Adquisiciones. Aprobado: notifica para inicio. Rechazado: notifica para archivo.",
          actionOnReject:
            "Observado: subsana y retorna. Rechazado: cancela trámite, solicita informes y archiva.",
          status: dec.status,
          statusLabel: dec.label,
          assignee: taskMap.get("taskDecisionFinalCat1")?.assignee,
          details: String(variables?.justificacion || ""),
        },
      ];
    }

    // CATEGORÍAS II, III Y ESPECIAL
    const verifAlm = getPhaseStatus("taskVerificarExistencias", variables?.aprobadoAlmacenes);
    const verifPre = getPhaseStatus("taskVerificarPresupuesto", variables?.aprobadoPresupuesto);
    const asig = getPhaseStatus("taskAsignarEncargado");
    const rev = getPhaseStatus("taskRevisarSolicitud");
    const sup = getPhaseStatus("taskAprobacionSuperior", variables?.aprobadoSuperior);
    const voboFin = getPhaseStatus(
      "taskVoboFinanciero",
      variables?.aprobadoFinanciero ?? variables?.voboFinanciero,
    );
    const voboLeg = getPhaseStatus(
      "taskVoboLegal",
      variables?.aprobadoLegal ?? variables?.voboLegal,
    );
    const gaf = getPhaseStatus("taskGafCat2", variables?.aprobadoGaf);
    const dec = getPhaseStatus("taskDecisionFinalCat2", variables?.decisionFinal);

    return [
      {
        num: "1",
        name: "Inicio de la solicitud de adquisiciones",
        responsible: "Unidad Solicitante",
        type: "Secuencial",
        possibleStates: "Inicio de Proceso",
        advanceCondition: "Adjuntar ET's o TDR's y Cotización",
        emailNotification:
          "Notifica por email simultáneamente a Existencias y Presupuestos.",
        actionOnReject: "—",
        status: "APPROVED",
        statusLabel: "Iniciado / Creado",
        assignee: String(variables?.iniciador || variables?.solicitante || "Solicitante"),
      },
      {
        num: "2",
        name: "Verificación de existencias / activos",
        responsible: "Encargado de Activos Fijos / Almacenes",
        type: "Simultáneo",
        possibleStates: "Aprobar / Rechazar",
        advanceCondition:
          "Confirma existencias o activos. Avanza cuando ESTE y Presupuestos aprueban.",
        emailNotification:
          "Al aprobar ambos VoBo: correo automático a Unidad de Adquisiciones.",
        actionOnReject: "Si Rechaza: notifica al Solicitante; se devuelve para ajuste o se detiene.",
        status: verifAlm.status,
        statusLabel: verifAlm.label,
        assignee: taskMap.get("taskVerificarExistencias")?.assignee,
        details: String(variables?.obsAlmacenes || ""),
      },
      {
        num: "3",
        name: "Verificación de presupuesto",
        responsible: "Encargado de Presupuestos",
        type: "Simultáneo",
        possibleStates: "Aprobar / Rechazar",
        advanceCondition:
          "Confirma disponibilidad presupuestaria. Avanza cuando ESTE y Almacenes aprueban.",
        emailNotification: "Sincronizado con Almacenes / Activos Fijos.",
        actionOnReject: "Si Rechaza: notifica al Solicitante; se devuelve para ajuste presupuestario.",
        status: verifPre.status,
        statusLabel: verifPre.label,
        assignee: taskMap.get("taskVerificarPresupuesto")?.assignee,
        details: String(variables?.obsPresupuesto || ""),
      },
      {
        num: "4",
        name: "Asignación Encargado de Adquisiciones",
        responsible: "Jefatura de Adquisiciones",
        type: "Secuencial",
        possibleStates: "Asignación del proceso",
        advanceCondition: "Asignación de la solicitud al Encargado de Contratación.",
        emailNotification: "Encargado de Contratación Asignado: notificado por email.",
        actionOnReject: "—",
        status: asig.status,
        statusLabel: asig.label,
        assignee: taskMap.get("taskAsignarEncargado")?.assignee,
        details: variables?.encargadoContratacionUserId
          ? `Asignado a: @${variables.encargadoContratacionUserId}`
          : undefined,
      },
      {
        num: "5",
        name: "Revisión solicitud de adquisición",
        responsible: "Encargado de Contratación",
        type: "Secuencial",
        possibleStates: "Revisión del Proceso",
        advanceCondition:
          "Adjuntar PDFs firmados, ET/TDR, cotizaciones, anexos y verificar Bien o Servicio.",
        emailNotification:
          "Remite al Inmediato Superior para su aprobación/rechazo se notifica por email.",
        actionOnReject:
          "Si Rechaza: notifica al Solicitante; devuelve para subsanar o se detiene.",
        status: rev.status,
        statusLabel: rev.label,
        assignee: taskMap.get("taskRevisarSolicitud")?.assignee,
      },
      {
        num: "6",
        name: "Aprobación Inmediato Superior",
        responsible: "Jefe Inmediato Superior - Unidad Solicitante",
        type: "Secuencial",
        possibleStates: "Aprobar / Rechazar",
        advanceCondition: "VoBo jerárquico de la unidad solicitante.",
        emailNotification: "Notificado al emitir visto bueno.",
        actionOnReject:
          "Si Rechaza: notifica al Solicitante y Adquisiciones; devuelve para ajuste o cancela.",
        status: sup.status,
        statusLabel: sup.label,
        assignee: taskMap.get("taskAprobacionSuperior")?.assignee,
        details: String(variables?.obsSuperior || ""),
      },
      {
        num: "7",
        name: "Visto bueno (VoBo) Financiero",
        responsible: "Jefe Administrativo Financiero",
        type: "Simultáneo",
        possibleStates: "Aprobar / Rechazar",
        advanceCondition:
          "Otorga VoBo administrativo-financiero. Avanza cuando ESTE y Jefe Legal aprueban.",
        emailNotification:
          "Al aprobar ambos VoBo (financiero + legal): notifica por correo a GAF.",
        actionOnReject:
          "Si Rechaza: notifica a Solicitante y Adquisiciones; retorna para subsanación.",
        status: voboFin.status,
        statusLabel: voboFin.label,
        assignee: taskMap.get("taskVoboFinanciero")?.assignee,
        details: String(variables?.obsFinanciero || ""),
      },
      {
        num: "8",
        name: "Visto bueno (VoBo) Legal",
        responsible: "Jefe Legal",
        type: "Simultáneo",
        possibleStates: "Aprobar / Rechazar",
        advanceCondition:
          "Otorga VoBo legal. Avanza cuando ESTE y Jefe Administrativo Financiero aprueban.",
        emailNotification: "Sincronizado con VoBo Financiero.",
        actionOnReject:
          "Si Rechaza: notifica a Solicitante y Adquisiciones; retorna para subsanación.",
        status: voboLeg.status,
        statusLabel: voboLeg.label,
        assignee: taskMap.get("taskVoboLegal")?.assignee,
        details: String(variables?.obsLegal || ""),
      },
      {
        num: "9",
        name: "Aprobación y Designación Comités (GAF)",
        responsible: "Gerencia Administrativa Financiera",
        type: "Secuencial",
        possibleStates: "Aprobar / Rechazar",
        advanceCondition:
          "1. Designa Comité Evaluador. 2. Designa Responsable de Recepción.",
        emailNotification:
          "Se notifica por correo al Responsable de Contratación para su decisión final.",
        actionOnReject:
          "Si Rechaza: notifica a Solicitante y Adquisiciones; devuelve para subsanar o cancela.",
        status: gaf.status,
        statusLabel: gaf.label,
        assignee: taskMap.get("taskGafCat2")?.assignee,
        details: [
          variables?.comiteEvaluador ? `Comité Evaluador: ${variables.comiteEvaluador}` : null,
          variables?.responsableRecepcion ? `Recepción: ${variables.responsableRecepcion}` : null,
        ]
          .filter(Boolean)
          .join(" | "),
      },
      {
        num: "10",
        name: "Decisión final",
        responsible: "Responsable de Contratación (Gerente General)",
        type: "Secuencial",
        possibleStates: "Observado / Aprobado / Rechazado",
        advanceCondition:
          "Decisión final tras los vistos buenos y designación de comisiones.",
        emailNotification:
          "Observado: notifica para subsanar. Aprobado: notifica a Encargado, Solicitante y miembros de Comités designados. Rechazado: notifica para archivo.",
        actionOnReject:
          "Observado = subsana y retorna. Rechazado = cancela, solicita informes y archiva.",
        status: dec.status,
        statusLabel: dec.label,
        assignee: taskMap.get("taskDecisionFinalCat2")?.assignee,
        details: String(variables?.justificacion || ""),
      },
    ];
  }, [isCat1, variables, taskMap]);

  // Renderizador de Badge por Estado
  const renderStatusTag = (status: PhaseStatus, label: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Tag color="success" style={{ fontWeight: 600, fontSize: 12, padding: "2px 8px" }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            {label}
          </Tag>
        );
      case "IN_PROGRESS":
        return (
          <Tag color="processing" style={{ fontWeight: 600, fontSize: 12, padding: "2px 8px" }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {label}
          </Tag>
        );
      case "OBSERVED":
        return (
          <Tag color="warning" style={{ fontWeight: 600, fontSize: 12, padding: "2px 8px" }}>
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
            {label}
          </Tag>
        );
      case "REJECTED":
        return (
          <Tag color="error" style={{ fontWeight: 600, fontSize: 12, padding: "2px 8px" }}>
            <CloseCircleOutlined style={{ marginRight: 4 }} />
            {label}
          </Tag>
        );
      case "PENDING":
      default:
        return (
          <Tag
            style={{
              backgroundColor: "#f1f5f9",
              borderColor: "#cbd5e1",
              color: "#64748b",
              fontWeight: 500,
              fontSize: 12,
              padding: "2px 8px",
            }}
          >
            {label}
          </Tag>
        );
    }
  };

  const columns: ColumnsType<PhaseDefinition> = [
    {
      title: "N°",
      dataIndex: "num",
      key: "num",
      width: 60,
      align: "center",
      render: (num: string) => <Text strong>{num}</Text>,
    },
    {
      title: "Fase / Estado del Flujo",
      dataIndex: "name",
      key: "name",
      render: (name: string, record) => (
        <div>
          <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
            {name}
          </Text>
          <div style={{ marginTop: 2 }}>
            <Tag color={record.type === "Simultáneo" ? "blue" : "default"} style={{ fontSize: 10 }}>
              {record.type}
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.possibleStates}
            </Text>
          </div>
          {record.details && (
            <div style={{ marginTop: 4, fontSize: 11, color: "#475569", background: "#f8fafc", padding: "2px 6px", borderRadius: 4 }}>
              {record.details}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Encargado(s) Responsable(s)",
      dataIndex: "responsible",
      key: "responsible",
      width: 230,
      render: (resp: string, record) => (
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: "#1e293b" }}>{resp}</div>
          {record.assignee && (
            <div style={{ marginTop: 2 }}>
              <Tag color="purple" style={{ fontSize: 10 }}>
                <UserOutlined style={{ marginRight: 2 }} />
                @{record.assignee}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Condición para Avanzar & Notificación",
      key: "conditionAndMail",
      render: (_, record) => (
        <div style={{ fontSize: 11, lineHeight: 1.4 }}>
          <div style={{ color: "#334155" }}>
            <strong>Condición:</strong> {record.advanceCondition}
          </div>
          <div style={{ color: "#2563eb", marginTop: 2 }}>
            <MailOutlined style={{ marginRight: 4 }} />
            {record.emailNotification}
          </div>
        </div>
      ),
    },
    {
      title: "Estado Actual",
      dataIndex: "status",
      key: "status",
      width: 140,
      align: "center",
      render: (status: PhaseStatus, record) => renderStatusTag(status, record.statusLabel),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tarjeta de Encabezado Institucional PR-GAF-08 */}
      <Card
        size="small"
        style={{
          borderRadius: 8,
          border: "1px solid #bfdbfe",
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
        }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} md={16}>
            <Space align="center" size="small">
              <ApartmentOutlined style={{ fontSize: 24, color: "#2563eb" }} />
              <div>
                <Title level={5} style={{ margin: 0, color: "#1e3a8a" }}>
                  ENDE ANDINA S.A.M. | PR-GAF-08
                </Title>
                <Text strong style={{ color: "#1d4ed8", fontSize: 13 }}>
                  {categoryTitle}
                </Text>
              </div>
            </Space>
            <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
              <strong>Responsable de Contratación según Anexo II:</strong>{" "}
              <Tag color="blue">{contratacionResponsible}</Tag>
              {Boolean(correlativoCode) ? (
                <span style={{ marginLeft: 8 }}>
                  <strong>N° Solicitud:</strong> {String(correlativoCode)}
                </span>
              ) : null}
              {Boolean(montoBs > 0) ? (
                <span style={{ marginLeft: 8 }}>
                  <strong>Monto Referencial:</strong> Bs.{" "}
                  {montoBs.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                </span>
              ) : null}
            </div>
          </Col>

          <Col xs={24} md={8}>
            {/* Leyenda de Estados Oficial */}
            <div
              style={{
                background: "#ffffff",
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 4 }}>
                Leyenda de Estados Normativos:
              </div>
              <Space wrap size={[6, 4]}>
                <Tag style={{ backgroundColor: "#f1f5f9", color: "#64748b", fontSize: 10 }}>
                  Pendiente (Gris)
                </Tag>
                <Tag color="success" style={{ fontSize: 10 }}>
                  Aprobado (Verde)
                </Tag>
                <Tag color="warning" style={{ fontSize: 10 }}>
                  Observado (Naranja)
                </Tag>
                <Tag color="error" style={{ fontSize: 10 }}>
                  Rechazado (Rojo)
                </Tag>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Alerta de Comités Designados si ya pasaron por GAF */}
      {Boolean(variables?.comiteEvaluador || variables?.responsableRecepcion) ? (
        <Alert
          type="info"
          showIcon
          icon={<TeamOutlined style={{ color: "#2563eb" }} />}
          message="Comisiones Oficiales Designadas por la Gerencia Administrativa Financiera (GAF)"
          description={
            <Row gutter={[16, 6]} style={{ marginTop: 4, fontSize: 12 }}>
              {Boolean(variables?.comiteEvaluador) ? (
                <Col xs={24} sm={12}>
                  <strong>Comité Evaluador:</strong> {String(variables?.comiteEvaluador)}
                </Col>
              ) : null}
              {Boolean(variables?.responsableRecepcion) ? (
                <Col xs={24} sm={12}>
                  <strong>Responsable de Recepción:</strong>{" "}
                  {String(variables?.responsableRecepcion)}
                </Col>
              ) : null}
            </Row>
          }
        />
      ) : null}

      {/* Tabla Oficial de la Matriz PR-GAF-08 */}
      <Table<PhaseDefinition>
        size="small"
        rowKey="num"
        columns={columns}
        dataSource={phases}
        pagination={false}
        bordered
      />
    </div>
  );
}

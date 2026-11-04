import {
  AppstoreAddOutlined,
  CodeOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  SaveOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { MenuProps } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../../common";
import {
  useSaveTaskFormMutation,
  useTaskFormByProcessTaskQuery,
} from "../hooks/useTasksQueries";
import { DynamicFormRenderer } from "./DynamicFormRenderer";
import type { DynamicJsonSchema, FormPropertySchema } from "../types/tasks.types";

const { Text, Title, Paragraph } = Typography;

export interface TaskFormFieldItem {
  id: string;
  key: string;
  title: string;
  type: "string" | "number" | "boolean" | "textarea" | "file" | "select";
  required: boolean;
  description?: string;
  enumOptions?: string[];
}

interface TaskFormConfigModalProps {
  open: boolean;
  processDefinitionKey: string | null;
  taskDefinitionKey: string | null;
  taskName: string | null;
  onClose: () => void;
}

export function TaskFormConfigModal({
  open,
  processDefinitionKey,
  taskDefinitionKey,
  taskName,
  onClose,
}: TaskFormConfigModalProps) {
  const isEnabled = open && Boolean(processDefinitionKey && taskDefinitionKey);

  const { data: existingForm, isLoading } = useTaskFormByProcessTaskQuery(
    processDefinitionKey ?? undefined,
    taskDefinitionKey ?? undefined,
    isEnabled,
  );

  const saveMutation = useSaveTaskFormMutation();

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [fields, setFields] = useState<TaskFormFieldItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("designer");

  // Al cargar o cambiar de tarea, inicializar el diseñador con el formulario existente o vacío
  useEffect(() => {
    if (!open) return;

    if (existingForm) {
      setFormTitle(existingForm.title || taskName || "");
      setFormDescription(existingForm.description || "");

      const loadedFields: TaskFormFieldItem[] = [];
      const schema = existingForm.schema;
      const requiredSet = new Set(schema?.required ?? []);

      if (schema?.properties) {
        Object.entries(schema.properties).forEach(([key, prop]) => {
          let fieldType: TaskFormFieldItem["type"] = "string";

          if (prop.enum && prop.enum.length > 0) {
            fieldType = "select";
          } else if (prop.type === "boolean") {
            fieldType = "boolean";
          } else if (prop.type === "number" || prop.type === "integer") {
            fieldType = "number";
          } else if (prop.format === "binary" || prop.format === "data-url") {
            fieldType = "file";
          } else if (prop.format === "textarea") {
            fieldType = "textarea";
          }

          loadedFields.push({
            id: `field_${Math.random().toString(36).substring(2, 9)}`,
            key,
            title: prop.title || key,
            type: fieldType,
            required: requiredSet.has(key),
            description: prop.description,
            enumOptions: prop.enum?.map(String) ?? [],
          });
        });
      }

      setFields(loadedFields);
    } else {
      setFormTitle(taskName ? `Formulario: ${taskName}` : "Formulario de etapa");
      setFormDescription("");
      setFields([]);
    }
  }, [open, existingForm, taskName]);

  // Convertir los campos visuales a JSON Schema estándar
  const computedSchema: DynamicJsonSchema = useMemo(() => {
    const properties: Record<string, FormPropertySchema> = {};
    const required: string[] = [];

    fields.forEach((f) => {
      const cleanKey = f.key.trim();
      if (!cleanKey) return;

      if (f.required) {
        required.push(cleanKey);
      }

      switch (f.type) {
        case "boolean":
          properties[cleanKey] = {
            type: "boolean",
            title: f.title || cleanKey,
            description: f.description || undefined,
          };
          break;

        case "number":
          properties[cleanKey] = {
            type: "number",
            title: f.title || cleanKey,
            description: f.description || undefined,
          };
          break;

        case "textarea":
          properties[cleanKey] = {
            type: "string",
            format: "textarea",
            title: f.title || cleanKey,
            description: f.description || undefined,
          };
          break;

        case "file":
          properties[cleanKey] = {
            type: "string",
            format: "binary",
            title: f.title || cleanKey,
            description: f.description || undefined,
          };
          break;

        case "select":
          properties[cleanKey] = {
            type: "string",
            title: f.title || cleanKey,
            enum: (f.enumOptions ?? []).filter(Boolean),
            description: f.description || undefined,
          };
          break;

        case "string":
        default:
          properties[cleanKey] = {
            type: "string",
            title: f.title || cleanKey,
            description: f.description || undefined,
          };
          break;
      }
    });

    return {
      type: "object",
      required: required.length > 0 ? required : undefined,
      properties,
    };
  }, [fields]);

  // Agregar nuevo campo en blanco
  const handleAddField = () => {
    const newField: TaskFormFieldItem = {
      id: `field_${Date.now()}`,
      key: `campo_${fields.length + 1}`,
      title: `Nuevo Campo ${fields.length + 1}`,
      type: "string",
      required: false,
    };
    setFields((prev) => [...prev, newField]);
  };

  // Modificar un campo existente
  const handleUpdateField = (
    id: string,
    updates: Partial<TaskFormFieldItem>,
  ) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  // Eliminar un campo
  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  // Plantillas Rápidas de Negocio para 1-clic
  const applyTemplate = (templateKey: string) => {
    if (templateKey === "approval") {
      setFields([
        {
          id: `field_${Date.now()}_1`,
          key: "aprobado",
          title: "¿Aprobado?",
          type: "boolean",
          required: true,
          description: "Marcar Sí para aprobar el trámite o No para observarlo",
        },
        {
          id: `field_${Date.now()}_2`,
          key: "observaciones",
          title: "Observaciones / Justificación",
          type: "textarea",
          required: false,
          description: "Motivo de la decisión o instrucciones adicionales",
        },
      ]);
    } else if (templateKey === "almacenes") {
      setFields([
        {
          id: `field_${Date.now()}_1`,
          key: "aprobadoAlmacenes",
          title: "Existencias en Almacén",
          type: "boolean",
          required: true,
          description: "Indica si existen activos/bienes similares en stock",
        },
        {
          id: `field_${Date.now()}_2`,
          key: "informeAlmacen",
          title: "Acta o Certificado de Existencias (PDF)",
          type: "file",
          required: false,
        },
        {
          id: `field_${Date.now()}_3`,
          key: "observacionesAlmacen",
          title: "Detalle de existencias o ubicación",
          type: "textarea",
          required: false,
        },
      ]);
    } else if (templateKey === "presupuesto") {
      setFields([
        {
          id: `field_${Date.now()}_1`,
          key: "aprobadoPresupuesto",
          title: "Disponibilidad Presupuestaria",
          type: "boolean",
          required: true,
        },
        {
          id: `field_${Date.now()}_2`,
          key: "partidaPresupuestaria",
          title: "Partida Presupuestaria",
          type: "string",
          required: true,
        },
        {
          id: `field_${Date.now()}_3`,
          key: "montoEstimadoBs",
          title: "Monto Certificado (Bs.)",
          type: "number",
          required: true,
        },
        {
          id: `field_${Date.now()}_4`,
          key: "preventivo",
          title: "Nº de Certificación Preventiva",
          type: "string",
          required: false,
        },
      ]);
    } else if (templateKey === "legal") {
      setFields([
        {
          id: `field_${Date.now()}_1`,
          key: "aprobadoLegal",
          title: "Dictamen Legal Favorable",
          type: "boolean",
          required: true,
        },
        {
          id: `field_${Date.now()}_2`,
          key: "informeLegal",
          title: "Informe Legal Firmado (PDF)",
          type: "file",
          required: true,
        },
        {
          id: `field_${Date.now()}_3`,
          key: "recomendacionesLegales",
          title: "Recomendaciones Jurídicas",
          type: "textarea",
          required: false,
        },
      ]);
    }
    message.info("Plantilla de campos cargada exitosamente.");
  };

  const templateMenuItems: MenuProps["items"] = [
    {
      key: "approval",
      label: "Plantilla Aprobación / VoBo (Sí/No + Observación)",
      onClick: () => applyTemplate("approval"),
    },
    {
      key: "almacenes",
      label: "Plantilla Verificación Almacenes (Existencia + Adjunto)",
      onClick: () => applyTemplate("almacenes"),
    },
    {
      key: "presupuesto",
      label: "Plantilla Certificación Presupuesto (Partida + Monto + Preventivo)",
      onClick: () => applyTemplate("presupuesto"),
    },
    {
      key: "legal",
      label: "Plantilla Dictamen Legal (Visto Bueno + Informe PDF)",
      onClick: () => applyTemplate("legal"),
    },
  ];

  // Guardar en el Backend
  const handleSave = async () => {
    if (!processDefinitionKey || !taskDefinitionKey) return;

    if (!formTitle.trim()) {
      message.error("El título del formulario es obligatorio.");
      return;
    }

    try {
      await saveMutation.mutateAsync({
        processKey: processDefinitionKey,
        taskKey: taskDefinitionKey,
        payload: {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          schema: computedSchema as unknown as Record<string, unknown>,
          active: true,
        },
      });

      message.success(
        `Formulario guardado correctamente para la etapa "${taskName || taskDefinitionKey}"`,
      );
      onClose();
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "No se pudo guardar el formulario"));
    }
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: "#2563eb", fontSize: 18 }} />
          <span>Configuración del Formulario Dinámico de la Etapa</span>
          {existingForm && <Tag color="green">Ya Configurado</Tag>}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={860}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancelar
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saveMutation.isPending}
          onClick={handleSave}
        >
          Guardar Formulario
        </Button>,
      ]}
    >
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin description="Cargando configuración del formulario..." />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Cabecera contextual de la tarea */}
          <div
            style={{
              backgroundColor: "#f8fafc",
              borderRadius: 8,
              padding: "8px 12px",
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
                Etapa BPMN
              </Text>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                {taskName || taskDefinitionKey}
              </div>
            </div>
            <Space size="small">
              <Tag color="geekblue" style={{ fontFamily: "monospace", fontSize: 11, margin: 0 }}>
                {taskDefinitionKey}
              </Tag>
              <Tag color="blue" style={{ fontSize: 11, margin: 0 }}>{processDefinitionKey}</Tag>
            </Space>
          </div>

          {/* Información General del Formulario */}
          <Row gutter={[12, 8]}>
            <Col xs={24} sm={16}>
              <Text strong style={{ fontSize: 12 }}>Título del Formulario:</Text>
              <Input
                size="small"
                style={{ marginTop: 2 }}
                placeholder="Ej. Revisión y Aprobación de Solicitud"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Text strong style={{ fontSize: 12 }}>Plantillas Rápidas:</Text>
              <div style={{ marginTop: 2 }}>
                <Dropdown menu={{ items: templateMenuItems }}>
                  <Button size="small" icon={<AppstoreAddOutlined />} style={{ width: "100%" }}>
                    Cargar Plantilla...
                  </Button>
                </Dropdown>
              </div>
            </Col>
            <Col xs={24}>
              <Text strong style={{ fontSize: 12 }}>Instrucciones para el usuario:</Text>
              <Input.TextArea
                rows={1}
                size="small"
                style={{ marginTop: 2 }}
                placeholder="Instrucciones que verá el evaluador en su bandeja..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </Col>
          </Row>

          <Divider style={{ margin: "4px 0" }} />

          {/* Pestañas: Diseñador de Campos / Vista Previa en Vivo / JSON */}
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: "designer",
                label: (
                  <Space>
                    <SettingOutlined />
                    <span>Diseñador de Campos ({fields.length})</span>
                  </Space>
                ),
                children: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Paragraph
                        type="secondary"
                        style={{ fontSize: 12, margin: 0 }}
                      >
                        Define las variables que el evaluador debe capturar en esta etapa.
                      </Paragraph>
                      <Button
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={handleAddField}
                      >
                        Agregar Campo
                      </Button>
                    </div>

                    {fields.length === 0 ? (
                      <Card
                        size="small"
                        style={{ textAlign: "center", background: "#f8fafc" }}
                      >
                        <Empty
                          description="No hay campos definidos para esta etapa. El evaluador solo verá el botón de completar sin campos requeridos."
                        >
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAddField}
                          >
                            Crear primer campo
                          </Button>
                        </Empty>
                      </Card>
                    ) : (
                      fields.map((field) => (
                        <Card
                          key={field.id}
                          size="small"
                          styles={{ body: { padding: "6px 10px" } }}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: 6,
                          }}
                        >
                          <Row gutter={[12, 8]} align="middle">
                            <Col xs={24} sm={6}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Clave / Variable BPMN:
                              </Text>
                              <Input
                                size="small"
                                placeholder="ej. aprobado"
                                value={field.key}
                                onChange={(e) =>
                                  handleUpdateField(field.id, {
                                    key: e.target.value.replace(/\s+/g, ""),
                                  })
                                }
                                style={{ fontFamily: "monospace" }}
                              />
                            </Col>

                            <Col xs={24} sm={7}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Etiqueta Visible:
                              </Text>
                              <Input
                                size="small"
                                placeholder="ej. ¿Aprobado?"
                                value={field.title}
                                onChange={(e) =>
                                  handleUpdateField(field.id, {
                                    title: e.target.value,
                                  })
                                }
                              />
                            </Col>

                            <Col xs={12} sm={6}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Tipo de Control:
                              </Text>
                              <Select
                                size="small"
                                style={{ width: "100%" }}
                                value={field.type}
                                onChange={(val) =>
                                  handleUpdateField(field.id, { type: val })
                                }
                                options={[
                                  { value: "string", label: "Texto Corto" },
                                  { value: "textarea", label: "Texto Largo (Observación)" },
                                  { value: "number", label: "Número / Monto" },
                                  { value: "boolean", label: "Interruptor Sí / No" },
                                  { value: "file", label: "Archivo Adjunto (PDF/Doc)" },
                                  { value: "select", label: "Selección (Opciones)" },
                                ]}
                              />
                            </Col>

                            <Col xs={8} sm={3} style={{ textAlign: "center" }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Requerido:
                              </Text>
                              <div>
                                <Switch
                                  size="small"
                                  checked={field.required}
                                  onChange={(val) =>
                                    handleUpdateField(field.id, {
                                      required: val,
                                    })
                                  }
                                />
                              </div>
                            </Col>

                            <Col xs={4} sm={2} style={{ textAlign: "right" }}>
                              <Tooltip title="Eliminar este campo">
                                <Button
                                  type="text"
                                  danger
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleRemoveField(field.id)}
                                />
                              </Tooltip>
                            </Col>

                            {/* Opciones adicionales si es tipo selección */}
                            {field.type === "select" && (
                              <Col xs={24} style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  Opciones del desplegable (separadas por coma):
                                </Text>
                                <Select
                                  mode="tags"
                                  size="small"
                                  style={{ width: "100%" }}
                                  placeholder="Escribe opciones y presiona Enter..."
                                  value={field.enumOptions}
                                  onChange={(opts) =>
                                    handleUpdateField(field.id, {
                                      enumOptions: opts,
                                    })
                                  }
                                />
                              </Col>
                            )}
                          </Row>
                        </Card>
                      ))
                    )}
                  </div>
                ),
              },
              {
                key: "preview",
                label: (
                  <Space>
                    <EyeOutlined />
                    <span>Vista Previa en Vivo</span>
                  </Space>
                ),
                children: (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <Alert
                      type="info"
                      showIcon
                      message="Previsualización del Formulario"
                      description="Así es exactamente como se renderizará este formulario dinámico para el evaluador cuando abra la tarea en su bandeja."
                    />

                    <Card
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: 8,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div style={{ marginBottom: 16 }}>
                        <Title level={5} style={{ margin: 0 }}>
                          {formTitle || "Formulario de la Etapa"}
                        </Title>
                        {formDescription && (
                          <Paragraph
                            type="secondary"
                            style={{ marginTop: 4, marginBottom: 0, fontSize: 13 }}
                          >
                            {formDescription}
                          </Paragraph>
                        )}
                      </div>

                      <Form layout="vertical">
                        <DynamicFormRenderer schema={computedSchema} />
                        <div style={{ marginTop: 24, textAlign: "right" }}>
                          <Button type="primary" disabled>
                            Completar y Enviar Tarea (Demo)
                          </Button>
                        </div>
                      </Form>
                    </Card>
                  </div>
                ),
              },
              {
                key: "json",
                label: (
                  <Space>
                    <CodeOutlined />
                    <span>Esquema JSON</span>
                  </Space>
                ),
                children: (
                  <div
                    style={{
                      backgroundColor: "#0f172a",
                      color: "#38bdf8",
                      borderRadius: 8,
                      padding: 16,
                      fontFamily: "monospace",
                      fontSize: 12,
                      maxHeight: 320,
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {JSON.stringify(computedSchema, null, 2)}
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}

import { SafetyCertificateOutlined } from "@ant-design/icons";
import { Form, Input, Modal, Radio, Space, Typography, message } from "antd";
import { useEffect } from "react";
import { getErrorMessage } from "../../common";
import {
  useCreateKeycloakRoleMutation,
  useUpdateKeycloakRoleMutation,
} from "../hooks/useKeycloakAdminQueries";

const { Paragraph } = Typography;

export interface RoleFormData {
  id?: string;
  name: string;
  description?: string;
  source: "realm" | "client";
}

interface RoleFormModalProps {
  open: boolean;
  role: RoleFormData | null;
  onClose: () => void;
}

export function RoleFormModal({ open, role, onClose }: RoleFormModalProps) {
  const [form] = Form.useForm<RoleFormData>();
  const isEditing = Boolean(role);

  const createMutation = useCreateKeycloakRoleMutation();
  const updateMutation = useUpdateKeycloakRoleMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      if (role) {
        form.setFieldsValue({
          name: role.name,
          description: role.description ?? "",
          source: role.source ?? "realm",
        });
      } else {
        form.resetFields();
        form.setFieldsValue({
          source: "realm",
        });
      }
    }
  }, [open, role, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const roleName = values.name.trim();

      if (isEditing && role) {
        await updateMutation.mutateAsync({
          roleName: role.name,
          payload: {
            name: roleName,
            description: values.description?.trim(),
            source: role.source,
          },
        });
        message.success(`Rol "${roleName}" actualizado correctamente`);
      } else {
        await createMutation.mutateAsync({
          name: roleName,
          description: values.description?.trim(),
          source: values.source ?? "realm",
        });
        message.success(`Rol "${roleName}" creado en Keycloak`);
      }

      onClose();
    } catch (err: unknown) {
      if ((err as { errorFields?: unknown })?.errorFields) {
        return; // Error de validación de Form
      }
      message.error(getErrorMessage(err, "No se pudo guardar el rol"));
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SafetyCertificateOutlined style={{ color: "#2563eb" }} />
          <span>{isEditing ? "Editar Rol de Keycloak" : "Nuevo Rol en Keycloak"}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditing ? "Guardar Cambios" : "Crear Rol"}
      confirmLoading={isSubmitting}
      destroyOnClose
    >
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        Los roles permiten agrupar permisos y se utilizan como grupos candidatos (<code>candidateGroups</code>) en los diagramas de flujos BPMN.
      </Paragraph>

      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Nombre del Rol"
          rules={[
            { required: true, message: "Ingresa el nombre del rol" },
            {
              pattern: /^[a-zA-Z0-9_\-.:]+$/,
              message: "Solo se permiten letras, números, guiones y puntos",
            },
          ]}
        >
          <Input
            placeholder="ej. auditor-compras, supervisor, analista"
            disabled={isEditing}
          />
        </Form.Item>

        <Form.Item
          name="source"
          label="Ámbito del Rol"
          tooltip="Los roles de Realm aplican globalmente a toda la organización. Los roles de Cliente aplican a la API."
        >
          <Radio.Group disabled={isEditing}>
            <Radio value="realm">Rol de Realm (Global)</Radio>
            <Radio value="client">Rol de Cliente (flow-manager-api)</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="description" label="Descripción">
          <Input.TextArea
            rows={3}
            placeholder="Describe las funciones o responsabilidades de este rol..."
            maxLength={250}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

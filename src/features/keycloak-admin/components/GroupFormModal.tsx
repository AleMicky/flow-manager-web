import { EditOutlined, TeamOutlined } from "@ant-design/icons";
import { Form, Input, Modal, Select, Space, message } from "antd";
import { useEffect } from "react";
import {
  useCreateKeycloakGroupMutation,
  useKeycloakGroupsQuery,
  useUpdateKeycloakGroupMutation,
} from "../hooks/useKeycloakAdminQueries";
import type { KeycloakGroupRepresentation } from "../types/keycloak-admin.types";

interface GroupFormModalProps {
  open: boolean;
  group: KeycloakGroupRepresentation | null;
  onClose: () => void;
}

interface GroupFormValues {
  name: string;
  parentId?: string;
}

export function GroupFormModal({ open, group, onClose }: GroupFormModalProps) {
  const [form] = Form.useForm<GroupFormValues>();
  const isEditing = Boolean(group);

  const createMutation = useCreateKeycloakGroupMutation();
  const updateMutation = useUpdateKeycloakGroupMutation();

  const { data: groups } = useKeycloakGroupsQuery(
    { first: 0, max: 100 },
    open && !isEditing,
  );

  useEffect(() => {
    if (!open) return;

    if (group) {
      form.setFieldsValue({
        name: group.name,
      });
    } else {
      form.resetFields();
    }
  }, [open, group, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (isEditing && group) {
        await updateMutation.mutateAsync({
          id: group.id,
          payload: { name: values.name.trim() },
        });
        message.success("Grupo actualizado correctamente");
      } else {
        await createMutation.mutateAsync({
          name: values.name.trim(),
          ...(values.parentId ? { parentId: values.parentId } : {}),
        });
        message.success("Grupo creado correctamente en Keycloak");
      }

      onClose();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "errorFields" in err) {
        return;
      }
      const axErr = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      message.error(
        axErr.response?.data?.message ||
          axErr.message ||
          "Error al guardar el grupo en Keycloak",
      );
    }
  };

  return (
    <Modal
      title={
        <Space>
          {isEditing ? (
            <EditOutlined style={{ color: "#10b981" }} />
          ) : (
            <TeamOutlined style={{ color: "#10b981" }} />
          )}
          <span>{isEditing ? "Editar Grupo" : "Nuevo Grupo Keycloak"}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText={isEditing ? "Guardar cambios" : "Crear grupo"}
      cancelText="Cancelar"
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item
          name="name"
          label="Nombre del grupo"
          rules={[{ required: true, message: "Ingresa el nombre del grupo" }]}
        >
          <Input placeholder="ej. Aprobadores Gerencia" />
        </Form.Item>

        {!isEditing && (
          <Form.Item name="parentId" label="Grupo padre (opcional)">
            <Select
              placeholder="Raíz (Sin grupo padre)"
              allowClear
              options={(groups ?? []).map((g) => ({
                value: g.id,
                label: `${g.name} (${g.path})`,
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}


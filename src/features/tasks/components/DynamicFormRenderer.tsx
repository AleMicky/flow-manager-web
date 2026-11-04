import {
  FileTextOutlined,
  PaperClipOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
  Upload,
} from "antd";
import { useState } from "react";
import type { DynamicJsonSchema, FormPropertySchema } from "../types/tasks.types";
import { useKeycloakUsersQuery } from "../../keycloak-admin/hooks/useKeycloakAdminQueries";

const { Text } = Typography;

interface DynamicFormRendererProps {
  schema: DynamicJsonSchema;
}

interface KeycloakUserSelectControlProps {
  value?: string;
  onChange?: (val?: string) => void;
  placeholder?: string;
}

function KeycloakUserSelectControl({
  value,
  onChange,
  placeholder,
}: KeycloakUserSelectControlProps) {
  const { data: usersData, isLoading } = useKeycloakUsersQuery({ max: 100 });
  const options = (usersData?.data ?? []).map((u) => {
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;
    return {
      value: u.username || u.id,
      label: `${fullName} (@${u.username})${u.email ? ` - ${u.email}` : ""}`,
    };
  });

  return (
    <Select
      showSearch
      loading={isLoading}
      value={value}
      onChange={onChange}
      placeholder={placeholder || "Seleccionar funcionario encargado..."}
      options={options}
      filterOption={(input, option) =>
        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
      }
      allowClear
      style={{ width: "100%" }}
      suffixIcon={<UserOutlined style={{ color: "#3b82f6" }} />}
    />
  );
}

interface FileUploadControlProps {
  value?: string;
  onChange?: (val?: string) => void;
}

function FileUploadControl({ value, onChange }: FileUploadControlProps) {
  const [fileName, setFileName] = useState<string | null>(() => {
    if (value && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (parsed?.name) return parsed.name as string;
      } catch {
        if (value.startsWith("data:")) return "Documento adjunto";
        return value;
      }
    }
    return null;
  });

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Upload
        maxCount={1}
        showUploadList={false}
        beforeUpload={(file) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Guardamos el JSON con los datos del archivo en formato string para el formulario
            const payload = JSON.stringify({
              name: file.name,
              size: file.size,
              type: file.type,
              data: result,
            });
            setFileName(file.name);
            onChange?.(payload);
          };
          reader.readAsDataURL(file);
          return false;
        }}
      >
        <Button icon={<UploadOutlined />}>
          {fileName ? "Reemplazar archivo" : "Seleccionar documento (PDF, Word, etc.)"}
        </Button>
      </Upload>

      {fileName && (
        <Space style={{ fontSize: 13, color: "#10b981", marginTop: 4 }}>
          <PaperClipOutlined />
          <Text strong style={{ color: "#10b981" }}>
            {fileName}
          </Text>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => {
              setFileName(null);
              onChange?.(undefined);
            }}
          >
            Quitar
          </Button>
        </Space>
      )}
    </Space>
  );
}

export function DynamicFormRenderer({ schema }: DynamicFormRendererProps) {
  if (!schema || !schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <Text type="secondary">
        Este paso no requiere campos de formulario adicionales.
      </Text>
    );
  }

  const requiredFields = new Set(schema.required ?? []);

  const renderFieldInput = (key: string, prop: FormPropertySchema) => {
    // 0. Selector de Funcionario / Usuario de Keycloak
    const isUserSelect =
      prop.format === "user-select" ||
      key.toLowerCase().includes("encargadocontratacion") ||
      key.toLowerCase().includes("usuarioasignado") ||
      (key.toLowerCase().endsWith("userid") && !key.toLowerCase().includes("start"));

    if (isUserSelect) {
      return (
        <KeycloakUserSelectControl
          placeholder={`Seleccionar funcionario para: ${prop.title ?? key}`}
        />
      );
    }

    // 1. Selector de Enum (Opciones fijas)
    if (prop.enum && prop.enum.length > 0) {
      const options = prop.enum.map((val, idx) => ({
        value: val,
        label: prop.enumNames?.[idx] ?? String(val),
      }));

      return (
        <Select
          placeholder="Seleccionar..."
          options={options}
          allowClear={!requiredFields.has(key)}
          style={{ width: "100%" }}
        />
      );
    }

    // 2. Booleano / Switch
    if (prop.type === "boolean") {
      return (
        <Switch
          checkedChildren="Sí"
          unCheckedChildren="No"
        />
      );
    }

    // 3. Numérico
    if (prop.type === "number" || prop.type === "integer") {
      return (
        <InputNumber
          style={{ width: "100%" }}
          min={prop.minimum}
          max={prop.maximum}
          placeholder={prop.title ?? key}
        />
      );
    }

    // 4. Adjunto de Documentos (Archivos / PDFs / Cotizaciones / ET)
    const isFile =
      prop.format === "binary" ||
      prop.format === "data-url" ||
      key.toLowerCase().startsWith("adjunto") ||
      key.toLowerCase().startsWith("archivo") ||
      key.toLowerCase().startsWith("documento") ||
      Boolean(prop.title && /(adjunto|archivo|documento|cotización|especificación|tdr)/i.test(prop.title));

    if (isFile) {
      return <FileUploadControl />;
    }

    // 5. Texto multilínea o texto estándar
    const isLongText =
      (prop.minLength && prop.minLength > 15) ||
      Boolean(prop.title && /(observaciones|comentarios|informe|justificación|descripción|instrucciones)/i.test(prop.title));

    if (isLongText) {
      return (
        <Input.TextArea
          rows={3}
          placeholder={prop.description ?? prop.title ?? key}
          showCount
        />
      );
    }

    return (
      <Input
        placeholder={prop.description ?? prop.title ?? key}
      />
    );
  };

  return (
    <div style={{ marginTop: 8 }}>
      {Object.entries(schema.properties).map(([key, prop]) => {
        const isRequired = requiredFields.has(key);
        const isBoolean = prop.type === "boolean";

        return (
          <Form.Item
            key={key}
            name={key}
            label={
              <Space>
                {key.toLowerCase().includes("adjunto") && <FileTextOutlined style={{ color: "#3b82f6" }} />}
                <span>{prop.title ?? key}</span>
              </Space>
            }
            valuePropName={isBoolean ? "checked" : "value"}
            initialValue={prop.default ?? (isBoolean ? false : undefined)}
            extra={prop.description && prop.description !== prop.title ? prop.description : undefined}
            rules={[
              {
                required: isRequired && !isBoolean,
                message: `El campo "${prop.title ?? key}" es obligatorio`,
              },
            ]}
          >
            {renderFieldInput(key, prop)}
          </Form.Item>
        );
      })}
    </div>
  );
}

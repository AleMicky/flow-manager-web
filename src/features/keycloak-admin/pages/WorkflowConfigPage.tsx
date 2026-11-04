import {
  ApartmentOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { Button, Space, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { BpmnTaskAssignmentsTab } from "../components/BpmnTaskAssignmentsTab";

const { Title, Text } = Typography;

export function WorkflowConfigPage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Cabecera compacta con navegación contextual */}
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
            <SettingOutlined style={{ color: "#3b82f6" }} />
            Configuración de Flujos (Responsables y Formularios)
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Configuración dinámica de aprobadores Keycloak y formularios por etapa BPMN.
          </Text>
        </div>

        <Space size="small" wrap>
          <Button
            size="small"
            icon={<ApartmentOutlined />}
            onClick={() => navigate("/definiciones")}
          >
            Definiciones BPMN
          </Button>
          <Button
            size="small"
            icon={<SafetyCertificateOutlined />}
            onClick={() => navigate("/keycloak")}
          >
            Directorio Keycloak
          </Button>
        </Space>
      </div>

      {/* Contenido principal de asignaciones */}
      <BpmnTaskAssignmentsTab />
    </div>
  );
}

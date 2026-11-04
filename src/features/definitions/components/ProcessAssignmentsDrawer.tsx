import { TeamOutlined } from "@ant-design/icons";
import { Drawer, Space, Typography } from "antd";
import { BpmnTaskAssignmentsTab } from "../../keycloak-admin/components/BpmnTaskAssignmentsTab";

const { Text } = Typography;

interface ProcessAssignmentsDrawerProps {
  open: boolean;
  processKey: string | null;
  processName?: string;
  onClose: () => void;
}

export function ProcessAssignmentsDrawer({
  open,
  processKey,
  processName,
  onClose,
}: ProcessAssignmentsDrawerProps) {
  return (
    <Drawer
      title={
        <Space>
          <TeamOutlined style={{ color: "#2563eb" }} />
          <span>Configuración de Asignaciones BPMN (Keycloak)</span>
          {processName && (
            <Text
              type="secondary"
              style={{ fontSize: 13, fontWeight: "normal" }}
            >
              — {processName}
            </Text>
          )}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={1000}
      destroyOnClose
    >
      {processKey && (
        <BpmnTaskAssignmentsTab
          initialProcessKey={processKey}
          hideHeaderBanner
          hideProcessSelector
        />
      )}
    </Drawer>
  );
}


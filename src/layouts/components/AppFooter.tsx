import { Tag, Typography } from "antd";

const { Text } = Typography;

export function AppFooter() {
    return (
        <footer className="fm-footer">
            <div className="fm-footer-left">
                <span className="fm-footer-dot" />
                <Text type="secondary">
                    FlowManager BPMN Engine · Todos los sistemas operativos
                </Text>
            </div>
            <div className="fm-footer-right">
                <Tag color="default" className="fm-version-tag">
                    v1.2.0
                </Tag>
                <Text type="secondary">Soporte TI 24/7</Text>
            </div>
        </footer>
    );
}

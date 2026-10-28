
import {
    Card,
    Col,
    Row,
    Statistic,
    Typography,
    Empty,
} from "antd";
import {
    FileTextOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    SyncOutlined,
} from "@ant-design/icons";

const { Title, Paragraph } = Typography;

export function Dashboard() {
    return (
        <>
            <Title level={2}>Dashboard</Title>
            <Paragraph type="secondary">
                Resumen general de solicitudes y procesos de aprobación.
            </Paragraph>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic
                            title="Solicitudes"
                            value={0}
                            prefix={<FileTextOutlined />}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic
                            title="Tareas pendientes"
                            value={0}
                            prefix={<ClockCircleOutlined />}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic
                            title="Aprobadas"
                            value={0}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} xl={6}>
                    <Card>
                        <Statistic
                            title="Procesos activos"
                            value={0}
                            prefix={<SyncOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <Card title="Actividad reciente" style={{ marginTop: 24 }}>
                <Empty description="Todavía no hay actividad registrada" />
            </Card>
        </>
    );
}

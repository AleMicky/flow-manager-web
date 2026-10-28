import {
    BellOutlined,
    ClockCircleOutlined,
    ThunderboltOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import { Badge, Button, Popover, Tag, Typography } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { initialNotifications, type NotificationItem } from "./layout.constants";

const { Text } = Typography;

export function NotificationPopover() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);

    const unreadCount = notifications.filter((n) => n.unread).length;

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    };

    const handleItemClick = (id: string) => {
        setNotifications((prev) =>
            prev.map((item) => (item.id === id ? { ...item, unread: false } : item)),
        );
    };

    const notificationContent = (
        <div className="fm-notifications-panel">
            <div className="fm-notifications-header">
                <div>
                    <Text strong className="fm-notifications-title">
                        Notificaciones
                    </Text>
                    {unreadCount > 0 && (
                        <Tag color="processing" className="fm-notifications-count-tag">
                            {unreadCount} nuevas
                        </Tag>
                    )}
                </div>
                {unreadCount > 0 && (
                    <Button
                        type="link"
                        size="small"
                        onClick={markAllAsRead}
                        className="fm-notifications-mark-read"
                    >
                        Marcar leídas
                    </Button>
                )}
            </div>

            <div className="fm-notifications-list">
                {notifications.length === 0 ? (
                    <div className="fm-notifications-empty">
                        <CheckCircleOutlined style={{ fontSize: 28, color: "#10b981" }} />
                        <Text type="secondary">Todo al día. No hay alertas pendientes.</Text>
                    </div>
                ) : (
                    notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`fm-notification-item ${n.unread ? "fm-notification-item--unread" : ""}`}
                            onClick={() => handleItemClick(n.id)}
                        >
                            <div className="fm-notification-icon-wrapper">
                                {n.type === "warning" && (
                                    <ClockCircleOutlined className="fm-notif-icon fm-notif-icon--warning" />
                                )}
                                {n.type === "info" && (
                                    <ThunderboltOutlined className="fm-notif-icon fm-notif-icon--info" />
                                )}
                                {n.type === "success" && (
                                    <CheckCircleOutlined className="fm-notif-icon fm-notif-icon--success" />
                                )}
                            </div>
                            <div className="fm-notification-body">
                                <div className="fm-notification-top">
                                    <Text strong className="fm-notification-item-title">
                                        {n.title}
                                    </Text>
                                    <Text className="fm-notification-time">{n.time}</Text>
                                </div>
                                <Text className="fm-notification-desc">{n.desc}</Text>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="fm-notifications-footer">
                <Button
                    type="text"
                    block
                    size="small"
                    onClick={() => {
                        setOpen(false);
                        navigate("/tareas");
                    }}
                >
                    Ir al centro de tareas y solicitudes
                </Button>
            </div>
        </div>
    );

    return (
        <Popover
            content={notificationContent}
            trigger="click"
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
            arrow={{ pointAtCenter: true }}
            classNames={{ root: "fm-notifications-popover" }}
        >
            <Badge
                count={unreadCount}
                size="small"
                offset={[-2, 6]}
                className="fm-header-badge"
            >
                <Button
                    type="text"
                    className="fm-icon-button"
                    icon={<BellOutlined />}
                    aria-label="Centro de notificaciones"
                />
            </Badge>
        </Popover>
    );
}

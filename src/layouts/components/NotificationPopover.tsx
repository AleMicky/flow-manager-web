import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Badge, Button, Popover, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useAvailableTasksQuery,
  useMyTasksQuery,
} from "../../features/tasks/hooks/useTasksQueries";

const { Text } = Typography;

interface LiveNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "warning" | "info" | "success";
  targetRoute: string;
}

export function NotificationPopover() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const { data: myTasksData } = useMyTasksQuery({ size: 5 });
  const { data: availableTasksData } = useAvailableTasksQuery({ size: 5 });

  const notifications: LiveNotification[] = useMemo(() => {
    const list: LiveNotification[] = [];

    // Tareas pendientes asignadas al usuario
    (myTasksData?.data || []).forEach((t) => {
      list.push({
        id: `my-${t.id}`,
        title: "Tarea Asignada Pendiente",
        desc: t.name || "Actividad pendiente de atención",
        time: t.createTime
          ? new Intl.DateTimeFormat("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
            }).format(new Date(t.createTime))
          : "Reciente",
        type: "warning",
        targetRoute: "/tareas",
      });
    });

    // Aprobaciones disponibles
    (availableTasksData?.data || []).forEach((t) => {
      list.push({
        id: `avail-${t.id}`,
        title: "Aprobación por Evaluar",
        desc: t.name || "Trámite en espera de dictamen",
        time: t.createTime
          ? new Intl.DateTimeFormat("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "short",
            }).format(new Date(t.createTime))
          : "Reciente",
        type: "info",
        targetRoute: "/aprobaciones",
      });
    });

    return list;
  }, [myTasksData?.data, availableTasksData?.data]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const handleItemClick = (n: LiveNotification) => {
    setReadIds((prev) => new Set(prev).add(n.id));
    setOpen(false);
    navigate(n.targetRoute);
  };

  const notificationContent = (
    <div className="fm-notifications-panel" style={{ width: 340 }}>
      <div className="fm-notifications-header">
        <div>
          <Text strong className="fm-notifications-title">
            Notificaciones
          </Text>
          {unreadCount > 0 && (
            <Tag color="processing" className="fm-notifications-count-tag">
              {unreadCount} activas
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

      <div className="fm-notifications-list" style={{ maxHeight: 360, overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div className="fm-notifications-empty" style={{ textAlign: "center", padding: "24px 16px" }}>
            <CheckCircleOutlined style={{ fontSize: 28, color: "#10b981", marginBottom: 8, display: "block" }} />
            <Text type="secondary">Todo al día. No hay tareas ni aprobaciones pendientes.</Text>
          </div>
        ) : (
          notifications.map((n) => {
            const isUnread = !readIds.has(n.id);
            return (
              <div
                key={n.id}
                className={`fm-notification-item ${isUnread ? "fm-notification-item--unread" : ""}`}
                onClick={() => handleItemClick(n)}
                style={{
                  cursor: "pointer",
                  padding: "10px 14px",
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: isUnread ? "#f8fafc" : "#ffffff",
                }}
              >
                <div className="fm-notification-icon-wrapper" style={{ marginTop: 2 }}>
                  {n.type === "warning" && (
                    <ClockCircleOutlined style={{ color: "#f59e0b", fontSize: 16 }} />
                  )}
                  {n.type === "info" && (
                    <ThunderboltOutlined style={{ color: "#3b82f6", fontSize: 16 }} />
                  )}
                  {n.type === "success" && (
                    <CheckCircleOutlined style={{ color: "#10b981", fontSize: 16 }} />
                  )}
                </div>
                <div className="fm-notification-body" style={{ flex: 1 }}>
                  <div
                    className="fm-notification-top"
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}
                  >
                    <Text strong style={{ fontSize: 12, color: "#1e293b" }}>
                      {n.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {n.time}
                    </Text>
                  </div>
                  <Text
                    style={{ fontSize: 12, color: "#475569", display: "block" }}
                    ellipsis={{ tooltip: n.desc }}
                  >
                    {n.desc}
                  </Text>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="fm-notifications-footer" style={{ borderTop: "1px solid #e2e8f0", padding: "8px 12px" }}>
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

import {
    ApartmentOutlined,
    AppstoreOutlined,
    CheckCircleOutlined,
    CheckSquareOutlined,
    FileTextOutlined,
    FileSearchOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { Badge, Button, Menu, Tooltip } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { useInstancesQuery } from "../../features/instances";
import { useMyTasksQuery } from "../../features/tasks";

interface AppSidebarProps {
    collapsed: boolean;
    onToggleCollapse?: () => void;
    onNavigate?: () => void;
    showToggle?: boolean;
}

export function AppSidebar({
    collapsed,
    onToggleCollapse,
    onNavigate,
    showToggle = true,
}: AppSidebarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuthStore();

    const isAdmin = Boolean(
        user?.roles?.some((r) =>
            ["workflow-admin", "admin", "realm-admin", "superadmin"].includes(
                r.toLowerCase(),
            ),
        ),
    );

    const { data: instancesData } = useInstancesQuery({ size: 1 });
    const activeInstancesCount = instancesData?.total ?? 0;

    const { data: myTasksData } = useMyTasksQuery({ size: 1 });
    const myTasksCount = myTasksData?.total ?? 0;

    const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
        if (key.startsWith("/")) {
            navigate(key);
            onNavigate?.();
        }
    };

    // Determinar la clave activa de menú
    const activeKey =
        [
            "/solicitudes",
            "/instancias",
            "/tareas",
            "/aprobaciones",
            "/procesos",
            "/usuarios",
            "/configuracion",
            "/perfil",
        ].find((path) => location.pathname.startsWith(path)) ||
        (location.pathname === "/" ? "/" : "");

    const menuItems: MenuProps["items"] = [
        {
            key: "inicio",
            type: "group",
            label: "PRINCIPAL",
            children: [
                {
                    key: "/",
                    icon: <AppstoreOutlined />,
                    label: "Dashboard",
                },
            ],
        },
        {
            key: "gestion",
            type: "group",
            label: "GESTIÓN",
            children: [
                {
                    key: "/solicitudes",
                    icon: <FileTextOutlined />,
                    label: (
                        <div className="fm-menu-badge-item">
                            <span>Solicitudes</span>
                            {activeInstancesCount > 0 && (
                                <Badge
                                    count={activeInstancesCount}
                                    size="small"
                                    className="fm-nav-badge fm-nav-badge--blue"
                                />
                            )}
                        </div>
                    ),
                },
                {
                    key: "/seguimiento",
                    icon: <FileSearchOutlined />,
                    label: "Trazabilidad",
                },
                {
                    key: "/tareas",
                    icon: <CheckSquareOutlined />,
                    label: (
                        <div className="fm-menu-badge-item">
                            <span>Mis tareas</span>
                            {myTasksCount > 0 && (
                                <Badge
                                    count={myTasksCount}
                                    size="small"
                                    className="fm-nav-badge fm-nav-badge--blue"
                                />
                            )}
                        </div>
                    ),
                },
                {
                    key: "/aprobaciones",
                    icon: <CheckCircleOutlined />,
                    label: (
                        <div className="fm-menu-badge-item">
                            <span>Aprobaciones</span>
                            {myTasksCount > 0 && (
                                <Badge
                                    count={myTasksCount}
                                    size="small"
                                    className="fm-nav-badge fm-nav-badge--amber"
                                />
                            )}
                        </div>
                    ),
                },
            ],
        },
        ...(isAdmin
            ? [
                  {
                      key: "administracion",
                      type: "group" as const,
                      label: "ADMINISTRACIÓN",
                      children: [
                          {
                              key: "/procesos",
                              icon: <ApartmentOutlined />,
                              label: "Procesos BPMN",
                          },
                          {
                              key: "/usuarios",
                              icon: <SafetyCertificateOutlined />,
                              label: "Usuarios y Roles",
                          },
                          {
                              key: "/configuracion",
                              icon: <SettingOutlined />,
                              label: "Configuración de Flujos",
                          },
                      ],
                  },
              ]
            : []),
    ];

    return (
        <div className="fm-sidebar-wrapper">
            {/* Cabecera / Marca del Sidebar */}
            <div
                className={`fm-brand ${collapsed ? "fm-brand--collapsed" : ""}`}
                onClick={() => {
                    navigate("/");
                    onNavigate?.();
                }}
                role="button"
                tabIndex={0}
            >
                <div className="fm-brand-logo">
                    <ApartmentOutlined />
                </div>

                {!collapsed && (
                    <div className="fm-brand-text">
                        <div className="fm-brand-title-row">
                            <span className="fm-brand-title">FlowManager</span>
                            <span className="fm-brand-badge">PROD</span>
                        </div>
                        <span className="fm-brand-subtitle">PLATAFORMA BPMN</span>
                    </div>
                )}
            </div>

            {/* Menú de navegación */}
            <div className="fm-sidebar-menu-container">
                <Menu
                    className="fm-menu"
                    theme="dark"
                    mode="inline"
                    inlineCollapsed={collapsed}
                    selectedKeys={[activeKey]}
                    items={menuItems}
                    onClick={handleMenuClick}
                />
            </div>

            {/* Pie del Sidebar: Toggle colapsar */}
            {showToggle && onToggleCollapse && (
                <div className="fm-sidebar-bottom">
                    <div className="fm-sidebar-toggle-row">
                        <Tooltip
                            title={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
                            placement="right"
                        >
                            <Button
                                type="text"
                                className="fm-sidebar-toggle-btn"
                                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                                onClick={onToggleCollapse}
                            >
                                {!collapsed && <span>Contraer menú</span>}
                            </Button>
                        </Tooltip>
                    </div>
                </div>
            )}
        </div>
    );
}

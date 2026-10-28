import {
    ApartmentOutlined,
    AppstoreOutlined,
    CheckSquareOutlined,
    FileTextOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    NodeIndexOutlined,
    QuestionCircleOutlined,
    SafetyCertificateOutlined,
    SettingOutlined,
} from "@ant-design/icons";
import { Badge, Button, Menu, Tooltip, Typography } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useInstancesQuery } from "../../features/instances";
import { useMyTasksQuery } from "../../features/tasks";

const { Text } = Typography;

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
                    label: "Solicitudes",
                },
                {
                    key: "/instancias",
                    icon: <NodeIndexOutlined />,
                    label: (
                        <div className="fm-menu-badge-item">
                            <span>Instancias</span>
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
                    icon: <ApartmentOutlined />,
                    label: (
                        <div className="fm-menu-badge-item">
                            <span>Aprobaciones</span>
                            <Badge
                                count={2}
                                size="small"
                                className="fm-nav-badge fm-nav-badge--amber"
                            />
                        </div>
                    ),
                },
            ],
        },
        {
            key: "administracion",
            type: "group",
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
                    label: "Configuración",
                },
            ],
        },
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

            {/* Pie del Sidebar: Soporte TI & Toggle */}
            <div className="fm-sidebar-bottom">
                {!collapsed ? (
                    <div className="fm-sidebar-help-card">
                        <div className="fm-help-header">
                            <div className="fm-help-icon">
                                <QuestionCircleOutlined />
                            </div>
                            <div className="fm-help-text">
                                <Text strong className="fm-help-title">
                                    Mesa de Ayuda TI
                                </Text>
                                <Text className="fm-help-description">
                                    Soporte técnico y manuales
                                </Text>
                            </div>
                        </div>
                        <Button
                            type="primary"
                            ghost
                            size="small"
                            className="fm-help-action-btn"
                            onClick={() => {
                                navigate("/configuracion");
                                onNavigate?.();
                            }}
                        >
                            Ver guías BPMN
                        </Button>
                    </div>
                ) : (
                    <div className="fm-sidebar-help-compact">
                        <Tooltip title="Soporte y Mesa de Ayuda TI" placement="right">
                            <Button
                                type="text"
                                className="fm-icon-button fm-icon-button--dark"
                                icon={<QuestionCircleOutlined />}
                                onClick={() => {
                                    navigate("/configuracion");
                                    onNavigate?.();
                                }}
                            />
                        </Tooltip>
                    </div>
                )}

                {/* Botón para colapsar en el sidebar */}
                {showToggle && onToggleCollapse && (
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
                )}
            </div>
        </div>
    );
}

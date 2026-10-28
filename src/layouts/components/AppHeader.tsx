import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    RightOutlined,
    SearchOutlined,
    AppstoreOutlined,
} from "@ant-design/icons";
import { Breadcrumb, Button, Input, Layout, Typography } from "antd";
import { Link, useLocation } from "react-router-dom";
import { routeMeta } from "./layout.constants";
import { NotificationPopover } from "./NotificationPopover";
import { UserProfileDropdown } from "./UserProfileDropdown";

const { Header } = Layout;
const { Title } = Typography;

interface AppHeaderProps {
    isMobile: boolean;
    collapsed: boolean;
    onToggleMenu: () => void;
}

export function AppHeader({ isMobile, collapsed, onToggleMenu }: AppHeaderProps) {
    const location = useLocation();

    // Detectar ruta activa limpia
    const currentPath =
        Object.keys(routeMeta).find((path) =>
            path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path),
        ) || "/";

    const currentMeta = routeMeta[currentPath] || {
        section: "Workspace",
        title: "FlowManager",
        icon: <AppstoreOutlined />,
    };

    return (
        <Header className="fm-header">
            <div className="fm-header-left">
                <Button
                    type="text"
                    className="fm-icon-button fm-header-burger"
                    icon={
                        isMobile ? (
                            <MenuUnfoldOutlined />
                        ) : collapsed ? (
                            <MenuUnfoldOutlined />
                        ) : (
                            <MenuFoldOutlined />
                        )
                    }
                    onClick={onToggleMenu}
                    aria-label="Alternar menú lateral"
                />

                {/* Breadcrumbs e Identificación de Sección */}
                <div className="fm-header-title-box">
                    <Breadcrumb
                        className="fm-breadcrumb"
                        separator={<RightOutlined style={{ fontSize: 9 }} />}
                        items={[
                            {
                                title: (
                                    <Link to="/" className="fm-breadcrumb-home">
                                        Workspace
                                    </Link>
                                ),
                            },
                            {
                                title: currentMeta.section,
                            },
                            {
                                title: (
                                    <span className="fm-breadcrumb-active">
                                        {currentMeta.title}
                                    </span>
                                ),
                            },
                        ]}
                    />
                    <div className="fm-header-page-heading">
                        <span className="fm-header-page-icon">{currentMeta.icon}</span>
                        <Title level={4} className="fm-header-page-title">
                            {currentMeta.title}
                        </Title>
                    </div>
                </div>
            </div>

            <div className="fm-header-actions">
                {/* Buscador global con atajo visual */}
                {!isMobile && (
                    <div className="fm-search-wrapper">
                        <Input
                            className="fm-search"
                            prefix={<SearchOutlined className="fm-search-icon" />}
                            suffix={<span className="fm-search-shortcut">⌘K</span>}
                            placeholder="Buscar procesos, solicitudes, folios..."
                            allowClear
                        />
                    </div>
                )}

                {/* Notificaciones Interactivas */}
                <NotificationPopover />

                <div className="fm-header-divider" />

                {/* Menú de Perfil de Usuario */}
                <UserProfileDropdown isMobile={isMobile} />
            </div>
        </Header>
    );
}

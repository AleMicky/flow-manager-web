import { CloseOutlined } from "@ant-design/icons";
import { Button, Drawer, Grid, Layout } from "antd";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useUIStore } from "../stores/ui.store";
import { AppFooter, AppHeader, AppSidebar } from "./components";

const { Sider, Content } = Layout;

export function MainLayout() {
    const { collapsed, toggleSidebar } = useUIStore();
    const screens = Grid.useBreakpoint();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isMobile = !screens.md;

    return (
        <Layout className="fm-layout">
            {/* Sider de escritorio */}
            {!isMobile && (
                <Sider
                    width={224}
                    collapsedWidth={64}
                    collapsed={collapsed}
                    trigger={null}
                    className="fm-sider"
                >
                    <AppSidebar
                        collapsed={collapsed}
                        onToggleCollapse={toggleSidebar}
                        showToggle
                    />
                </Sider>
            )}

            <Layout className="fm-main">
                {/* Header superior */}
                <AppHeader
                    isMobile={isMobile}
                    collapsed={collapsed}
                    onToggleMenu={() => {
                        if (isMobile) {
                            setMobileOpen(true);
                        } else {
                            toggleSidebar();
                        }
                    }}
                />

                {/* Contenido dinámico */}
                <Content className="fm-content">
                    <div className="fm-content-inner">
                        <Outlet />
                    </div>

                    <AppFooter />
                </Content>
            </Layout>

            {/* Menú móvil Drawer */}
            <Drawer
                title={null}
                placement="left"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                closable={false}
                size={240}
                className="fm-mobile-drawer"
                styles={{
                    body: {
                        padding: 0,
                        background: "#0f172a",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                    },
                }}
            >
                <div className="fm-drawer-close-bar">
                    <Button
                        type="text"
                        icon={<CloseOutlined style={{ color: "#94a3b8" }} />}
                        onClick={() => setMobileOpen(false)}
                        aria-label="Cerrar menú"
                    />
                </div>
                <AppSidebar
                    collapsed={false}
                    onNavigate={() => setMobileOpen(false)}
                    showToggle={false}
                />
            </Drawer>
        </Layout>
    );
}

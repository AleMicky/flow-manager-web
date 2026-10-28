import {
    DownOutlined,
    LogoutOutlined,
    SettingOutlined,
    UserOutlined,
} from "@ant-design/icons";
import { Avatar, Badge, Dropdown, Tag, Typography } from "antd";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";

const { Text } = Typography;

interface UserProfileDropdownProps {
    isMobile?: boolean;
}

export function UserProfileDropdown({ isMobile = false }: UserProfileDropdownProps) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const displayName = user?.name || user?.username || "Usuario";
    const email = user?.email || (user?.username ? `${user.username}@flowmanager.io` : "sesion@flowmanager.io");
    const role = user?.roles?.length ? user.roles[0] : "Usuario";

    const profileMenuItems: MenuProps["items"] = [
        {
            key: "user-card",
            type: "group",
            label: (
                <div className="fm-profile-dropdown-header">
                    <div className="fm-profile-dropdown-user">
                        <Avatar
                            size={44}
                            icon={<UserOutlined />}
                            className="fm-avatar fm-avatar--large"
                        />
                        <div className="fm-profile-dropdown-info">
                            <Text strong className="fm-profile-dropdown-name">
                                {displayName}
                            </Text>
                            <Text className="fm-profile-dropdown-email">
                                {email}
                            </Text>
                            <Tag color="#6366f1" className="fm-profile-tag">
                                {role}
                            </Tag>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            type: "divider",
        },
        {
            key: "/perfil",
            icon: <UserOutlined />,
            label: "Mi perfil",
            onClick: () => navigate("/perfil"),
        },
        {
            key: "/configuracion",
            icon: <SettingOutlined />,
            label: "Configuración de cuenta",
            onClick: () => navigate("/configuracion"),
        },
        {
            type: "divider",
        },
        {
            key: "salir",
            icon: <LogoutOutlined />,
            label: "Cerrar sesión",
            danger: true,
            onClick: () => {
                logout();
            },
        },
    ];

    return (
        <Dropdown
            menu={{ items: profileMenuItems }}
            trigger={["click"]}
            placement="bottomRight"
            classNames={{ root: "fm-profile-dropdown" }}
        >
            <button
                className="fm-profile"
                type="button"
                aria-label="Menú de usuario"
            >
                <Badge
                    dot
                    status="success"
                    offset={[-3, 26]}
                >
                    <Avatar
                        size={32}
                        icon={<UserOutlined />}
                        className="fm-avatar"
                    />
                </Badge>

                {!isMobile && (
                    <div className="fm-profile-info">
                        <Text strong className="fm-profile-name">
                            {displayName}
                        </Text>
                        <Text className="fm-profile-role">
                            {role}
                        </Text>
                    </div>
                )}

                <DownOutlined className="fm-profile-chevron" />
            </button>
        </Dropdown>
    );
}

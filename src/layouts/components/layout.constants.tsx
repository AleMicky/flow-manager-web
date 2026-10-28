import {
    AppstoreOutlined,
    CheckSquareOutlined,
    FileTextOutlined,
    ApartmentOutlined,
    SettingOutlined,
    UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

export interface RouteMetaItem {
    section: string;
    title: string;
    icon: ReactNode;
}

export const routeMeta: Record<string, RouteMetaItem> = {
    "/": {
        section: "Principal",
        title: "Dashboard",
        icon: <AppstoreOutlined />,
    },
    "/solicitudes": {
        section: "Gestión",
        title: "Solicitudes",
        icon: <FileTextOutlined />,
    },
    "/tareas": {
        section: "Gestión",
        title: "Mis tareas",
        icon: <CheckSquareOutlined />,
    },
    "/aprobaciones": {
        section: "Gestión",
        title: "Aprobaciones",
        icon: <ApartmentOutlined />,
    },
    "/procesos": {
        section: "Administración",
        title: "Procesos BPMN",
        icon: <ApartmentOutlined />,
    },
    "/configuracion": {
        section: "Administración",
        title: "Configuración",
        icon: <SettingOutlined />,
    },
    "/perfil": {
        section: "Cuenta",
        title: "Mi perfil",
        icon: <UserOutlined />,
    },
};

export interface NotificationItem {
    id: string;
    title: string;
    desc: string;
    time: string;
    unread: boolean;
    type: "warning" | "info" | "success";
}

export const initialNotifications: NotificationItem[] = [
    {
        id: "1",
        title: "Aprobación pendiente",
        desc: "Solicitud de compra #FM-2024-089 requiere tu revisión.",
        time: "Hace 10 min",
        unread: true,
        type: "warning",
    },
    {
        id: "2",
        title: "Nueva tarea asignada",
        desc: "Validación de requisitos técnicos para nuevo flujo.",
        time: "Hace 1 hora",
        unread: true,
        type: "info",
    },
    {
        id: "3",
        title: "Proceso completado con éxito",
        desc: "Flujo de alta de proveedor #PR-441 ha finalizado.",
        time: "Ayer",
        unread: false,
        type: "success",
    },
];

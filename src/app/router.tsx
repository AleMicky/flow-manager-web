import { Navigate, createBrowserRouter } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { Dashboard } from "../features/dashboard/Dashboard";
import { ProtectedRoute } from "../features/auth/components/ProtectedRoute";
import { LoginPage } from "../features/auth/pages/LoginPage";

import { DefinitionsPage } from "../features/definitions";
import { InstancesPage } from "../features/instances";
import { TasksPage } from "../features/tasks";
import { ApprovalsPage } from "../features/approvals";
import { KeycloakAdminPage } from "../features/keycloak-admin";
import { UserProfilePage } from "../features/profile";
import { NotFoundPage } from "../features/common";

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/",
        element: <ProtectedRoute />,
        children: [
            {
                element: <MainLayout />,
                children: [
                    {
                        index: true,
                        element: <Dashboard />,
                    },
                    {
                        path: "solicitudes",
                        element: <InstancesPage />,
                    },
                    {
                        path: "instancias",
                        element: <Navigate to="/solicitudes" replace />,
                    },
                    {
                        path: "tareas",
                        element: <TasksPage />,
                    },
                    {
                        path: "aprobaciones",
                        element: <ApprovalsPage />,
                    },
                    {
                        path: "procesos",
                        element: <DefinitionsPage />,
                    },
                    {
                        path: "usuarios",
                        element: <KeycloakAdminPage />,
                    },
                    {
                        path: "configuracion",
                        element: <KeycloakAdminPage />,
                    },
                    {
                        path: "perfil",
                        element: <UserProfilePage />,
                    },
                    {
                        path: "*",
                        element: <NotFoundPage />,
                    },
                ],
            },
        ],
    },
]);

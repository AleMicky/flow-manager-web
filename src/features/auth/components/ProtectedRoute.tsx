import { LoadingOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../stores/auth.store";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          background: "#0f172a",
          color: "#f8fafc",
        }}
      >
        <Spin
          indicator={
            <LoadingOutlined style={{ fontSize: 36, color: "#6366f1" }} spin />
          }
        />
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem" }}>
          Verificando sesión segura...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

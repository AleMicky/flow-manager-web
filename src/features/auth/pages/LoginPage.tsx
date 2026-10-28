import {
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
  CheckCircleFilled,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { Alert, Button, Card, Divider, Space, Tag, Typography } from "antd";
import { useEffect, useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../../stores/auth.store";

const { Title, Text, Paragraph } = Typography;

export function LoginPage() {
  const { isLoading, login, checkSession } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const errorMessage = useMemo(() => {
    if (errorParam) {
      return errorDescription || `Error en el flujo de autenticación: ${errorParam}`;
    }
    return null;
  }, [errorParam, errorDescription]);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  useEffect(() => {
    checkSession().then((authenticated) => {
      if (authenticated) {
        navigate(from, { replace: true });
      }
    });
  }, [checkSession, from, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%, #020617 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 16px",
              borderRadius: 16,
              background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
            }}
          >
            <ApartmentOutlined style={{ fontSize: 28, color: "#ffffff" }} />
          </div>
          <Title level={2} style={{ color: "#f8fafc", margin: 0, fontWeight: 700 }}>
            FlowManager
          </Title>
          <Text style={{ color: "#94a3b8", fontSize: "0.95rem" }}>
            Plataforma Integral de Workflows & BPMN
          </Text>
        </div>

        <Card
          style={{
            background: "rgba(30, 41, 59, 0.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            borderRadius: 16,
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          }}
          styles={{ body: { padding: "32px 28px" } }}
        >
          <div style={{ marginBottom: 24 }}>
            <Title level={4} style={{ color: "#f1f5f9", margin: "0 0 8px 0" }}>
              Bienvenido de nuevo
            </Title>
            <Paragraph style={{ color: "#94a3b8", margin: 0, fontSize: "0.88rem" }}>
              Inicia sesión mediante el proveedor de identidad corporativo (Keycloak / OIDC).
            </Paragraph>
          </div>

          {errorMessage && (
            <Alert
              type="error"
              showIcon
              message="Fallo en la autenticación"
              description={errorMessage}
              style={{
                marginBottom: 20,
                borderRadius: 8,
                background: "rgba(239, 68, 68, 0.12)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                color: "#fca5a5",
              }}
            />
          )}

          <Button
            type="primary"
            size="large"
            block
            icon={<ArrowRightOutlined />}
            loading={isLoading}
            onClick={() => login()}
            style={{
              height: 48,
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              borderColor: "transparent",
              boxShadow: "0 8px 20px -4px rgba(99, 102, 241, 0.4)",
            }}
          >
            Iniciar sesión con Keycloak
          </Button>

          <Divider style={{ borderColor: "rgba(148, 163, 184, 0.15)", margin: "24px 0" }}>
            <Text style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase" }}>
              Seguridad BFF
            </Text>
          </Divider>

          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", fontSize: "0.82rem" }}>
              <CheckCircleFilled style={{ color: "#10b981", fontSize: 14 }} />
              <span>Autenticación OIDC con PKCE seguro</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", fontSize: "0.82rem" }}>
              <CheckCircleFilled style={{ color: "#10b981", fontSize: 14 }} />
              <span>Tokens resguardados en sesión Redis del BFF</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", fontSize: "0.82rem" }}>
              <CheckCircleFilled style={{ color: "#10b981", fontSize: 14 }} />
              <span>Protección contra CSRF y cookies HttpOnly</span>
            </div>
          </Space>
        </Card>

        <div style={{ textAlign: "center" }}>
          <Space orientation="horizontal" size={8} wrap style={{ justifyContent: "center" }}>
            <Tag
              icon={<SafetyCertificateOutlined />}
              style={{
                background: "rgba(99, 102, 241, 0.1)",
                borderColor: "rgba(99, 102, 241, 0.2)",
                color: "#a5b4fc",
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              Keycloak Realm
            </Tag>
            <Tag
              icon={<ThunderboltOutlined />}
              style={{
                background: "rgba(16, 185, 129, 0.1)",
                borderColor: "rgba(16, 185, 129, 0.2)",
                color: "#6ee7b7",
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              Flowable Engine Ready
            </Tag>
          </Space>
        </div>
      </div>
    </div>
  );
}

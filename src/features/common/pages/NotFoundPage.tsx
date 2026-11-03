import { ArrowLeftOutlined, HomeOutlined } from "@ant-design/icons";
import { Button, Result, Space } from "antd";
import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "65vh",
        padding: 24,
      }}
    >
      <Result
        status="404"
        title="404"
        subTitle="La página o sección solicitada no existe o ha sido reubicada."
        extra={
          <Space size="middle">
            <Button
              type="primary"
              icon={<HomeOutlined />}
              onClick={() => navigate("/")}
            >
              Ir al Dashboard
            </Button>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(-1)}
            >
              Volver Atrás
            </Button>
          </Space>
        }
      />
    </div>
  );
}


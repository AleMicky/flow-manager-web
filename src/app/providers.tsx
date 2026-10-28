
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, App as AntApp } from "antd";
import esES from "antd/locale/es_ES";
import { useState, type ReactNode } from "react";

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        retry: 1,
                        refetchOnWindowFocus: false,
                    },
                },
            }),
    );

    return (
        <QueryClientProvider client={queryClient}>
            <ConfigProvider
                locale={esES}
                theme={{
                    token: {
                        colorPrimary: "#6366f1",
                        colorPrimaryHover: "#4f46e5",
                        colorPrimaryActive: "#4338ca",
                        colorLink: "#6366f1",
                        colorLinkHover: "#4f46e5",
                        colorInfo: "#6366f1",
                        borderRadius: 8,
                        fontFamily: "Inter, system-ui, sans-serif",
                    },
                }}
            >
                <AntApp>{children}</AntApp>
            </ConfigProvider>
        </QueryClientProvider>
    );
}

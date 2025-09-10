import { useNekoShare } from "@/context/nekoshare";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { HomeUI } from "@workspace/app-ui/components/home/main/index";
import { HomeLayout } from "@workspace/app-ui/components/home/layout";
import { useEffect, useMemo } from "react";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const { setGlobalLoading } = useNekoShare();

  const getWelcomeKey = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "สวัสดีตอนเช้า";
    if (hour >= 12 && hour < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setGlobalLoading(false), 1000);
    return () => clearTimeout(timer);
  }, [setGlobalLoading]);

  return (
    <HomeLayout title={`${getWelcomeKey}, Adam`}>
      <HomeUI
        onItemClick={function (id: number): void {
          throw new Error("Function not implemented.");
        }}
        onItemDownload={function (id: number): void {
          throw new Error("Function not implemented.");
        }}
        onBulkDelete={function (ids: number[]): void {
          throw new Error("Function not implemented.");
        }}
      />
    </HomeLayout>
  );
}

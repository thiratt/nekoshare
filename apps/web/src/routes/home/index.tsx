import { authClient } from "@/libs/auth";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { HomeUI } from "@workspace/app-ui/components/home/main/index";
import { HomeLayout } from "@workspace/app-ui/components/home/layout";
import { useEffect, useMemo } from "react";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const session = authClient.useSession();

  const getWelcomeKey = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "สวัสดีตอนเช้า";
    if (hour >= 12 && hour < 17) return "สวัสดีตอนบ่าย";
    return "สวัสดีตอนเย็น";
  }, []);

  useEffect(() => {
    if (!session.data) {
      return;
    }
    console.log(session.data);
  }, [session.data]);

  return (
    <HomeLayout title={`${getWelcomeKey}, Thiratcha`}>
      <HomeUI
        onItemClick={(id) =>
          router.navigate({ to: "/home/m/$id", params: { id: `${id}` } })
        }
        onItemDownload={(id) => {
          console.log(id);
        }}
        onBulkDelete={(ids) => {
          console.log(ids);
        }}
      />
    </HomeLayout>
  );
}

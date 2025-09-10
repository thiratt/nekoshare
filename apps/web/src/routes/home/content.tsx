import { createFileRoute } from "@tanstack/react-router";
import { ContentUI } from "@workspace/app-ui/components/home/content/index";
import { HomeLayout } from "@workspace/app-ui/components/home/layout";

export const Route = createFileRoute("/home/content")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <HomeLayout title="ข้อความและไฟล์">
      <ContentUI />
    </HomeLayout>
  );
}

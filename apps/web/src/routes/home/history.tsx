import { createFileRoute } from "@tanstack/react-router";
import { HistoryUI } from "@workspace/app-ui/components/home/history";
import { HomeLayout } from "@workspace/app-ui/components/home/layout";

export const Route = createFileRoute("/home/history")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <HomeLayout title="ประวัติการแชร์">
      <HistoryUI />
    </HomeLayout>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { DeviceUI } from "@workspace/app-ui/components/home/device";
import { HomeLayout } from "@workspace/app-ui/components/home/layout";

export const Route = createFileRoute("/home/devices")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <HomeLayout title="อุปกรณ์">
      <DeviceUI />
    </HomeLayout>
  );
}

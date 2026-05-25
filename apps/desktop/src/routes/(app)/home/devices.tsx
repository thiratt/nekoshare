import { createFileRoute } from "@tanstack/react-router";

import { DevicesUI } from "@workspace/app-ui/components/ui/devices/index";

export const Route = createFileRoute("/(app)/home/devices")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DevicesUI />;
}

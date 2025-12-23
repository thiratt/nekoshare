import { createFileRoute } from "@tanstack/react-router";

import { DevicesUI } from "@workspace/app-ui/components/ui/devices/index";

export const Route = createFileRoute("/home/devices")({
  component: RouteComponent,
});

function RouteComponent() {
  return <DevicesUI />;
}

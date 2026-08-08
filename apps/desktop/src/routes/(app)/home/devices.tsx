import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { DevicesUI } from "@workspace/app-ui/components/ui/devices/index";

export const Route = createFileRoute("/(app)/home/devices")({
  component: DevicesPage,
});

function DevicesPage() {
  const navigate = useNavigate();

  return (
    <DevicesUI
      onSendFiles={() => {
        void navigate({ to: "/share/new" });
      }}
    />
  );
}

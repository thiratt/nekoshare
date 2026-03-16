import { createFileRoute } from "@tanstack/react-router";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const Route = createFileRoute("/home/devices")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <FeaturePlaceholder
      eyebrow="Next Up"
      title="Devices page placeholder"
      description="This route is reserved for the shared device management UI. In the next phase it will use mocked device data while keeping the same desktop-like layout."
    />
  );
}

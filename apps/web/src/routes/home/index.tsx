import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@workspace/ui/components/badge";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const Route = createFileRoute("/home/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <FeaturePlaceholder
      eyebrow="Phase 1"
      title="Home foundation is ready"
      description="This route now sits behind real session checks and the shared NekoShare provider stack. The desktop-like pages will plug into this shell in the next phase with mocked data."
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Real auth</Badge>
        <Badge variant="secondary">Shared theme</Badge>
        <Badge variant="secondary">Shared settings overlay</Badge>
        <Badge variant="secondary">Guarded routes</Badge>
      </div>
    </FeaturePlaceholder>
  );
}

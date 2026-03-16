import { createFileRoute } from "@tanstack/react-router";

import { FeaturePlaceholder } from "@/components/feature-placeholder";

export const Route = createFileRoute("/home/friends")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <FeaturePlaceholder
      eyebrow="Next Up"
      title="Friends page placeholder"
      description="The route is in place so the web shell already matches desktop navigation. The next phase will replace this with the shared friends UI backed by mocked data."
    />
  );
}

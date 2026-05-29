import { createFileRoute } from "@tanstack/react-router";

import { ReceivedFilesUI } from "@workspace/app-ui/components/ui/files/index";

export const Route = createFileRoute("/(app)/home/files")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ReceivedFilesUI />;
}

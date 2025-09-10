import { createFileRoute } from "@tanstack/react-router";
import { TrashUI } from "@workspace/app-ui/components/home/trash";

export const Route = createFileRoute("/home/trash")({
  component: RouteComponent,
});

function RouteComponent() {
  return <TrashUI />;
}

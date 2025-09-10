import { DemoUi } from "@/components/demo";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/web")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen flex justify-center items-center">
      <DemoUi />
    </div>
  );
}

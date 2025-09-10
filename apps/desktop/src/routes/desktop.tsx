import { DemoUi } from "@/components/demo";
import { NavigationBar } from "@/components/navbar";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/desktop")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen flex flex-col">
      <NavigationBar />
      <div className="flex-1 flex justify-center items-center">
        <DemoUi />
      </div>
    </div>
  );
}

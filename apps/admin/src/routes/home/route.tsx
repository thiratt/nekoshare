import { HomeSidebar } from "@/components/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/home")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-svh flex flex-col">
      <div className="flex flex-1 transition-all divide-x">
        <HomeSidebar />
        <div className="flex-1 bg-muted p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

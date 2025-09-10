import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/home/members")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-2xl">จัดการสมาชิก</h1>
      </div>
      <Outlet />
    </div>
  );
}

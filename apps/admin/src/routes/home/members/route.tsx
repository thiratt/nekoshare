import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/home/members")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-full flex flex-col gap-2">
      <h1 className="font-semibold text-2xl">จัดการสมาชิก</h1>
      <Outlet />
    </div>
  );
}

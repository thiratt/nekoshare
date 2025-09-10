import { NavigationBar } from "@/components/navbar";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { HomeSidebar } from "@workspace/app-ui/components/home-sidebar";

export const Route = createFileRoute("/home")({
  component: RouteComponent,
});

function RouteComponent() {
  const location = useLocation();

  return (
    <div className="min-h-svh flex flex-col">
      <NavigationBar />
      <div className="flex flex-1 transition-all divide-x">
        <HomeSidebar linkComponent={Link} pathname={location.pathname} />
        <div className="flex-1 bg-muted p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

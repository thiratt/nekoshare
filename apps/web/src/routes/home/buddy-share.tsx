import { createFileRoute } from "@tanstack/react-router";
import { HomeLayout } from "@workspace/app-ui/components/home/layout";
import { BuddyShareUI } from "@workspace/app-ui/components/home/buddy-share";

export const Route = createFileRoute("/home/buddy-share")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <HomeLayout title="Buddy Share">
      <BuddyShareUI />
    </HomeLayout>
  );
}

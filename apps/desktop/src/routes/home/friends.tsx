import { createFileRoute } from "@tanstack/react-router";

import { FriendsUI } from "@workspace/app-ui/components/ui/friends";

export const Route = createFileRoute("/home/friends")({
  component: RouteComponent,
});

function RouteComponent() {
  return <FriendsUI />;
}

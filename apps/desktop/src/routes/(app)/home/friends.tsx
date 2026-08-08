import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { FriendsUI } from "@workspace/app-ui/components/ui/friends/index";

export const Route = createFileRoute("/(app)/home/friends")({
  component: FriendsPage,
});

function FriendsPage() {
  const navigate = useNavigate();

  return (
    <FriendsUI
      onSendFiles={() => {
        void navigate({ to: "/share/new" });
      }}
    />
  );
}

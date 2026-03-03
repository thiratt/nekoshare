import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { TransferDetailUI } from "@workspace/app-ui/components/ui/transfer-detail/index";

export const Route = createFileRoute("/home/transfer-detail")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <TransferDetailUI
      onBack={() => navigate({ to: "/home" })}
      onPauseToggle={() => {
        console.log("Pause/Resume transfer (mock)");
      }}
      onOpenFolder={() => {
        console.log("Open folder (mock)");
      }}
      onCancel={() => {
        console.log("Cancel transfer (mock)");
      }}
      onRetry={() => {
        console.log("Retry transfer (mock)");
      }}
      onDone={() => navigate({ to: "/home" })}
    />
  );
}

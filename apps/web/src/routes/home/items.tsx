import { createFileRoute } from "@tanstack/react-router";
import { ItemUI } from "@workspace/app-ui/components/home/item/index";
import { HomeLayout } from "@workspace/app-ui/components/home/layout";

export const Route = createFileRoute("/home/items")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <HomeLayout title="รายการย้อนหลัง">
      <ItemUI />
    </HomeLayout>
  );
}

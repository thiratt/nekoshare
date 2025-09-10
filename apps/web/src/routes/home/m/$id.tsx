import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/m/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return <div>Hello "/home/m/{id}"!</div>;
}

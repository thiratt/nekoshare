import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/home/f/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();

  return <div>Hello "/home/s/{id}"!</div>;
}

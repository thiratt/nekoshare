import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCachedSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  async beforeLoad() {
    const { isAuthenticated } = await getCachedSession();
    if (isAuthenticated) {
      throw redirect({ to: "/home" });
    }

    throw redirect({ to: "/login" });
  },
  component: App,
});

function App() {
  return <div>:(</div>;
}

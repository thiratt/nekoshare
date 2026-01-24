import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCachedSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  async beforeLoad() {
    const result = await getCachedSession();

    if (result.status === "success") {
      if (result.data.isAuthenticated) {
        throw redirect({ to: "/home" });
      } else {
        throw redirect({ to: "/login" });
      }
    } else {
      console.error("Failed to fetch session:", result.error.toUserMessage());
    }

    // Default redirect to login on error
    throw redirect({ to: "/login" });
  },
  component: App,
});

function App() {
  return <div>:(</div>;
}

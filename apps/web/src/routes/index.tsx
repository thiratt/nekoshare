import { createFileRoute, redirect } from "@tanstack/react-router";

import { getCachedSession } from "@/lib/auth";

export const Route = createFileRoute("/")({
  async beforeLoad() {
    const result = await getCachedSession();

    if (result.status === "success") {
      throw redirect({ to: result.data.isAuthenticated ? "/home" : "/login" });
    }

    console.error("Failed to fetch session:", result.error.toUserMessage());
    throw redirect({ to: "/login" });
  },
  component: () => null,
});

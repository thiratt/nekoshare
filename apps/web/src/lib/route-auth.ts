import { redirect } from "@tanstack/react-router";

import { getCachedSession } from "@/lib/auth";

export async function requireAuthenticatedSession() {
  const result = await getCachedSession();

  if (result.status === "success") {
    if (!result.data.isAuthenticated || !result.data.session) {
      throw redirect({ to: "/login" });
    }

    return {
      session: result.data.session.session,
      user: result.data.session.user,
    };
  }

  console.error("Failed to fetch session:", result.error.toUserMessage());
  throw redirect({ to: "/login" });
}

export async function redirectAuthenticatedUser() {
  const result = await getCachedSession();

  if (result.status === "success" && result.data.isAuthenticated) {
    throw redirect({ to: "/home" });
  }

  if (result.status === "error") {
    console.error("Failed to fetch session:", result.error.toUserMessage());
  }
}

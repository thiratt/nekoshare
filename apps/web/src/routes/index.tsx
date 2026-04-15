import { createFileRoute } from "@tanstack/react-router";

import { useTheme } from "@workspace/app-ui/providers/theme-provider";

import { CTA } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Platforms } from "@/components/landing/platforms";
import { Security } from "@/components/landing/security";
import { Stats } from "@/components/landing/stats";

export const Route = createFileRoute("/")({
  async beforeLoad() {
    // TODO: This is a bit of a hack to avoid a flash of the landing page for authenticated users. We should
    // ideally have a better way to handle this, but for now it works.
    // const result = await getCachedSession();
    // // Authenticated users go straight to the app.
    // if (result.status === "success" && result.data.isAuthenticated) {
    //   throw redirect({ to: "/home" });
    // }
    // Unauthenticated users and session-fetch errors both fall through
    // to the landing page below.
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-screen bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.12),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-168 h-96 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.08),transparent_70%)]" />
      <div className="relative">
        <Header theme={theme} setTheme={setTheme} />
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Platforms />
        <Security />
        <CTA />
        <Footer theme={theme} />
      </div>
    </div>
  );
}

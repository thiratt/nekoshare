import { lazy, Suspense } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { useTheme } from "@workspace/app-ui/providers/theme-provider";

import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";

const LandingSecondarySections = lazy(
  () => import("@/components/landing/secondary-sections"),
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        name: "description",
        content:
          "Neko Share is an open-source, self-hostable file sharing app with secure transfers. Free to use.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:locale", content: "en_US" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Neko Share" },
      { property: "og:url", content: "https://nekoshare.app/" },
      {
        property: "og:title",
        content: "Neko Share | Open-Source Self-Hostable File Sharing",
      },
      {
        property: "og:description",
        content:
          "Neko Share is an open-source, self-hostable file sharing app with secure transfers. Free to use.",
      },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Neko Share | Open-Source Self-Hostable File Sharing",
      },
      {
        name: "twitter:description",
        content:
          "Neko Share is an open-source, self-hostable file sharing app with secure transfers. Free to use.",
      },
      { title: "Neko Share | Open-Source Self-Hostable File Sharing" },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Neko Share",
              alternateName: "NekoShare",
              url: "https://nekoshare.app/",
              description:
                "Neko Share is an open-source, self-hostable file sharing app with secure transfers. Free to use.",
              inLanguage: "en",
            },
            {
              "@type": "Organization",
              name: "Neko Share",
              alternateName: "NekoShare",
              url: "https://nekoshare.app/",
              logo: "https://nekoshare.app/favicon.svg",
            },
          ],
        },
      },
    ],
    links: [{ rel: "canonical", href: "https://nekoshare.app/" }],
  }),
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
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header theme={theme} setTheme={setTheme} />
      <main>
        <Hero />
        <Suspense fallback={null}>
          <LandingSecondarySections theme={theme} />
        </Suspense>
      </main>
    </div>
  );
}

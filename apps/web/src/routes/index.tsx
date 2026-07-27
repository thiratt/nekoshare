import { Suspense } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { useTheme } from "@workspace/app-ui/providers/theme-provider";

import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import LandingSecondarySections from "@/components/landing/secondary-sections";

const title = "Neko Share | Open-Source Self-Hostable File Sharing";

const description =
  "Neko Share is an open-source, self-hostable file sharing app with secure transfers. Free to use.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },

      {
        name: "description",
        content: description,
      },
      {
        name: "robots",
        content: "index,follow",
      },

      {
        property: "og:locale",
        content: "en_US",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "Neko Share",
      },
      {
        property: "og:url",
        content: "https://nekoshare.app/",
      },
      {
        property: "og:title",
        content: title,
      },
      {
        property: "og:description",
        content: description,
      },

      {
        name: "twitter:card",
        content: "summary",
      },
      {
        name: "twitter:title",
        content: title,
      },
      {
        name: "twitter:description",
        content: description,
      },
    ],

    links: [
      {
        rel: "canonical",
        href: "https://nekoshare.app/",
      },
    ],

    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "Neko Share",
              alternateName: "NekoShare",
              url: "https://nekoshare.app/",
              description,
              inLanguage: "en",
            },
            {
              "@type": "SoftwareApplication",
              name: "Neko Share",
              alternateName: "NekoShare",
              url: "https://nekoshare.app/",
              description,
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Windows, Android, Web",
            },
          ],
        }),
      },
    ],
  }),

  component: RouteComponent,
});

function RouteComponent() {
  const { setTheme } = useTheme();

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Header setTheme={setTheme} />

      <main>
        <Hero />

        <Suspense fallback={null}>
          <LandingSecondarySections />
        </Suspense>
      </main>
    </div>
  );
}

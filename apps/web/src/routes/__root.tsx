import type { ReactNode } from "react";

import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

import "@workspace/ui/globals.css";
import "../styles.css";
import { ErrorComponent } from "@/components/error";
import { GoogleAnalytics } from "@/components/google-analytics";
import { NotFoundComponent } from "@/components/not-found";
import { ThemeHeadSync } from "@/components/theme-head-sync";

export const Route = createRootRoute({
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,
  head: () => ({
    meta: [
      { charSet: "UTF-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "theme-color", content: "#ffffff", id: "theme-color-meta" },
      { name: "color-scheme", content: "light dark" },
      { name: "application-name", content: "Neko Share" },
      { name: "apple-mobile-web-app-title", content: "Neko Share" },
      {
        name: "description",
        content:
          "Neko Share is an open-source, self-hostable file sharing app with secure transfers. Free to use.",
      },
      { name: "robots", content: "index,follow" },
      { name: "referrer", content: "strict-origin-when-cross-origin" },
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
      {
        property: "og:image",
        content: "https://nekoshare.app/web-app-manifest-512x512.png",
      },
      { property: "og:image:alt", content: "Neko Share logo" },
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
      {
        name: "twitter:image",
        content: "https://nekoshare.app/web-app-manifest-512x512.png",
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
    links: [
      { rel: "canonical", href: "https://nekoshare.app/" },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
        id: "app-favicon-svg",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        href: "/favicon-96x96.png",
        id: "app-favicon-png",
      },
      { rel: "shortcut icon", href: "/favicon.ico", id: "app-favicon-ico" },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
        id: "app-apple-touch-icon",
      },
      { rel: "manifest", href: "/site.webmanifest", id: "app-manifest" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <GoogleAnalytics />
        <ThemeProvider>
          <ThemeHeadSync />
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}

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
      { name: "referrer", content: "strict-origin-when-cross-origin" },
    ],
    links: [
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

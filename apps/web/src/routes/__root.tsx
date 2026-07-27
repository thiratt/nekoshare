import type { ReactNode } from "react";

import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import globalStylesUrl from "@workspace/ui/globals.css?url";

import { ThemeProvider } from "@workspace/app-ui/providers/theme-provider";

import fontBoldUrl from "../assets/fonts/LINESeedSansTH_W_Bd.woff2?url";
import fontRegularUrl from "../assets/fonts/LINESeedSansTH_W_Rg.woff2?url";
import appStylesUrl from "../styles.css?url";

import { ErrorComponent } from "@/components/error";
import { GoogleAnalytics } from "@/components/google-analytics";
import { NotFoundComponent } from "@/components/not-found";
import { ThemeHeadSync } from "@/components/theme-head-sync";

const themeInitializationScript = `
  (() => {
    const root = document.documentElement;
    let theme = "system";

    try {
      theme = localStorage.getItem("nekoshare-ui-theme") || "system";
    } catch {}

    const resolvedTheme =
      theme === "light" || theme === "dark"
        ? theme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
    root.style.colorScheme = resolvedTheme;

    const themeColor = document.getElementById("theme-color-meta");

    if (themeColor) {
      themeColor.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#09090b" : "#ffffff",
      );
    }
  })();
`;

export const Route = createRootRoute({
  errorComponent: ErrorComponent,
  notFoundComponent: NotFoundComponent,

  head: () => ({
    meta: [
      {
        name: "application-name",
        content: "Neko Share",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Neko Share",
      },
      {
        name: "referrer",
        content: "strict-origin-when-cross-origin",
      },
    ],

    links: [
      {
        rel: "preload",
        href: fontRegularUrl,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        href: fontBoldUrl,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: globalStylesUrl,
      },
      {
        rel: "stylesheet",
        href: appStylesUrl,
      },
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
      {
        rel: "shortcut icon",
        href: "/favicon.ico",
        id: "app-favicon-ico",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
        id: "app-apple-touch-icon",
      },
      {
        rel: "manifest",
        href: "/site.webmanifest",
        id: "app-manifest",
      },
    ],
  }),

  shellComponent: RootDocument,
});

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          id="theme-color-meta"
          name="theme-color"
          content="#ffffff"
          suppressHydrationWarning
        />
        <script
          data-cfasync="false"
          dangerouslySetInnerHTML={{ __html: themeInitializationScript }}
          suppressHydrationWarning
        />
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

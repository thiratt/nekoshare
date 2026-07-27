import { useEffect } from "react";

import { useTheme } from "@workspace/app-ui/providers/theme-provider";

const LIGHT_THEME_COLOR = "#ffffff";
const DARK_THEME_COLOR = "#09090b";

const LIGHT_ASSETS = {
  svg: "/favicon.svg",
  png: "/favicon-96x96.png",
  ico: "/favicon.ico",
  apple: "/apple-touch-icon.png",
  manifest: "/site.webmanifest",
};

function resolveTheme(theme: "light" | "dark" | "system"): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  return theme;
}

function syncHead(theme: "light" | "dark") {
  const assets = LIGHT_ASSETS;
  const themeColor = theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;

  const setHref = (id: string, href: string) => {
    const element = document.getElementById(id);

    if (element) {
      element.setAttribute("href", href);
    }
  };

  setHref("app-favicon-svg", assets.svg);
  setHref("app-favicon-png", assets.png);
  setHref("app-favicon-ico", assets.ico);
  setHref("app-apple-touch-icon", assets.apple);
  setHref("app-manifest", assets.manifest);

  const themeColorMeta = document.getElementById("theme-color-meta");

  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", themeColor);
  }
}

export function ThemeHeadSync() {
  const { theme } = useTheme();

  useEffect(() => {
    const applyTheme = () => {
      syncHead(resolveTheme(theme));
    };

    applyTheme();

    if (theme !== "system") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    mediaQuery.addEventListener("change", applyTheme);

    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  return null;
}

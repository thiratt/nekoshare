import { useEffect } from "react";

import { useRouterState } from "@tanstack/react-router";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

export function GoogleAnalytics() {
  const href = useRouterState({
    select: (state) => state.location.href,
  });

  useEffect(() => {
    if (!measurementId || import.meta.env.DEV) {
      return;
    }

    window.dataLayer = window.dataLayer || [];

    if (!window.gtag) {
      window.gtag = (...args: unknown[]) => {
        window.dataLayer.push(args);
      };
    }

    if (document.getElementById("google-gtag")) {
      return;
    }

    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });

    const script = document.createElement("script");
    script.id = "google-gtag";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!measurementId || import.meta.env.DEV || !window.gtag) {
      return;
    }

    window.gtag("config", measurementId, {
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [href]);

  return null;
}

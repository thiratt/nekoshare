import { useEffect, useState } from "react";

import { useRouterState } from "@tanstack/react-router";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
// eslint-disable-next-line turbo/no-undeclared-env-vars -- DEV is a Vite built-in, not deployment config.
const isDevelopment = import.meta.env.DEV;

export function GoogleAnalytics() {
  const href = useRouterState({
    select: (state) => state.location.href,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!measurementId || isDevelopment) {
      return;
    }

    let timeoutId: number | undefined;

    const initializeAnalytics = () => {
      window.dataLayer = window.dataLayer || [];

      if (!window.gtag) {
        window.gtag = (...args: unknown[]) => {
          window.dataLayer.push(args);
        };
      }

      if (!document.getElementById("google-gtag")) {
        const script = document.createElement("script");
        script.id = "google-gtag";
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
        document.head.appendChild(script);
      }

      window.gtag("js", new Date());
      window.gtag("config", measurementId, { send_page_view: false });
      setIsReady(true);
    };

    const scheduleAnalytics = () => {
      timeoutId = window.setTimeout(initializeAnalytics, 1_000);
    };

    if (document.readyState === "complete") {
      scheduleAnalytics();
      return () => {
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    const handleLoad = () => {
      scheduleAnalytics();
    };

    window.addEventListener("load", handleLoad, { once: true });

    return () => {
      window.removeEventListener("load", handleLoad);

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!measurementId || isDevelopment || !isReady || !window.gtag) {
      return;
    }

    window.gtag("config", measurementId, {
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
      page_location: window.location.href,
    });
  }, [href, isReady]);

  return null;
}

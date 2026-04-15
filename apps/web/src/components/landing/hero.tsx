import {
  lazy,
  type PointerEventHandler,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

import { Button } from "@workspace/ui/components/button";

const INTERACTIVE_BACKGROUND_QUERY =
  "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

const LazyHexagonBackground = lazy(async () => {
  const module = await import("./background");

  return { default: module.HexagonBackground };
});

function getInteractiveBackgroundState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(INTERACTIVE_BACKGROUND_QUERY).matches;
}

export function Hero() {
  const [activePoint, setActivePoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showInteractiveBackground, setShowInteractiveBackground] = useState(
    getInteractiveBackgroundState,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(INTERACTIVE_BACKGROUND_QUERY);
    const handleChange = () => {
      setShowInteractiveBackground(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!showInteractiveBackground) {
      setActivePoint(null);
    }
  }, [showInteractiveBackground]);

  const handlePointerMoveCapture = useCallback<
    PointerEventHandler<HTMLElement>
  >((event) => {
    const bounds = event.currentTarget.getBoundingClientRect();

    setActivePoint({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setActivePoint(null);
  }, []);

  return (
    <section
      className="relative min-h-screen overflow-hidden pt-24 pb-16"
      onPointerMoveCapture={
        showInteractiveBackground ? handlePointerMoveCapture : undefined
      }
      onPointerLeave={
        showInteractiveBackground ? handlePointerLeave : undefined
      }
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.18),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.04))]" />
        {showInteractiveBackground ? (
          <Suspense fallback={null}>
            <LazyHexagonBackground activePoint={activePoint} />
          </Suspense>
        ) : null}
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8">
          <div className="relative z-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm backdrop-blur-sm">
              <span className="flex h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Coming soon!</span>
            </div>

            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
                <span className="block">A Better Way</span>
                <span className="block mt-1">to Share Files</span>
                <span className="block mt-1 bg-linear-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
                  Across Your Devices
                </span>
              </h1>
            </div>

            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
              Send files to your own devices or share them with friends in a
              flow that stays simple, direct, and easy to trust.
            </p>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="group h-14 rounded-2xl px-8 text-base font-medium"
                disabled
              >
                Coming soon
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="h-14 rounded-2xl px-8 text-base font-medium"
              >
                See how it works
              </Button>
            </div>
          </div>

          <div className="z-10"></div>
        </div>
      </div>
    </section>
  );
}

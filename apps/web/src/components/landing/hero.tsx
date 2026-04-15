import { type PointerEventHandler, useCallback, useState } from "react";

import { Button } from "@workspace/ui/components/button";

import { motion } from "@workspace/app-ui/components/provide-animate";

import { HexagonBackground } from "./background";

export function Hero() {
  const [activePoint, setActivePoint] = useState<{
    x: number;
    y: number;
  } | null>(null);

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
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerLeave={handlePointerLeave}
    >
      <div className="absolute inset-0 z-0">
        <HexagonBackground activePoint={activePoint} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8">
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm backdrop-blur-sm"
            >
              <span className="flex h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-muted-foreground">Coming soon!</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
                <span className="block">A Better Way</span>
                <span className="block mt-1">to Share Files</span>
                <span className="block mt-1 bg-linear-to-r from-foreground via-foreground/80 to-muted-foreground bg-clip-text text-transparent">
                  Across Your Devices
                </span>
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 text-lg text-muted-foreground max-w-md leading-relaxed"
            >
              Send files to your own devices or share them with friends in a
              flow that stays simple, direct, and easy to trust.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 flex flex-col sm:flex-row gap-4"
            >
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
            </motion.div>
          </div>

          <div className="z-10"></div>
        </div>
      </div>
    </section>
  );
}

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

type PointerPoint = {
  x: number;
  y: number;
};

type InteractionTier = "idle" | "far" | "near" | "core";

type HexagonBackgroundProps = React.ComponentProps<"div"> & {
  activePoint?: PointerPoint | null;
  hexagonProps?: React.ComponentProps<"div">;
  hexagonSize?: number;
  hexagonMargin?: number;
};

function HexagonBackground({
  activePoint,
  className,
  children,
  hexagonProps,
  hexagonSize = 75,
  hexagonMargin = 3,
  ...props
}: HexagonBackgroundProps) {
  const hexagonWidth = hexagonSize;
  const hexagonHeight = hexagonSize * 1.1;
  const rowSpacing = hexagonSize * 0.8;
  const baseMarginTop = -36 - 0.275 * (hexagonSize - 100);
  const computedMarginTop = baseMarginTop + hexagonMargin;
  const oddRowMarginLeft = -(hexagonSize / 2);
  const evenRowMarginLeft = hexagonMargin / 2;

  const [gridDimensions, setGridDimensions] = React.useState({
    rows: 0,
    columns: 0,
  });
  const [animatedPoint, setAnimatedPoint] = React.useState<PointerPoint | null>(
    null,
  );
  const rootRef = React.useRef<HTMLDivElement>(null);
  const cellRefs = React.useRef(new Map<string, HTMLDivElement>());
  const animatedPointRef = React.useRef<PointerPoint | null>(null);
  const targetPointRef = React.useRef<PointerPoint | null>(activePoint ?? null);
  const animationFrameRef = React.useRef<number | null>(null);
  const [cellMetrics, setCellMetrics] = React.useState<
    Array<{
      centerX: number;
      centerY: number;
      key: string;
    }>
  >([]);

  const updateGridDimensions = React.useCallback(() => {
    const rows = Math.ceil(window.innerHeight / rowSpacing);
    const columns = Math.ceil(window.innerWidth / hexagonWidth) + 1;
    setGridDimensions({ rows, columns });
  }, [rowSpacing, hexagonWidth]);

  const updateCellMetrics = React.useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const rootRect = root.getBoundingClientRect();
    const nextMetrics = Array.from(cellRefs.current.entries()).map(
      ([key, element]) => {
        const rect = element.getBoundingClientRect();
        return {
          centerX: rect.left - rootRect.left + rect.width / 2,
          centerY: rect.top - rootRect.top + rect.height / 2,
          key,
        };
      },
    );

    setCellMetrics(nextMetrics);
  }, []);

  const stopAnimation = React.useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const animatePoint = React.useCallback(() => {
    const target = targetPointRef.current;

    if (!target) {
      animatedPointRef.current = null;
      setAnimatedPoint(null);
      animationFrameRef.current = null;
      return;
    }

    const current = animatedPointRef.current ?? target;
    const nextPoint = {
      x: current.x + (target.x - current.x) * 0.18,
      y: current.y + (target.y - current.y) * 0.18,
    };

    animatedPointRef.current = nextPoint;
    setAnimatedPoint(nextPoint);

    const delta =
      Math.abs(target.x - nextPoint.x) + Math.abs(target.y - nextPoint.y);

    if (delta < 0.4) {
      animatedPointRef.current = target;
      setAnimatedPoint(target);
      animationFrameRef.current = null;
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(animatePoint);
  }, []);

  React.useEffect(() => {
    updateGridDimensions();
    window.addEventListener("resize", updateGridDimensions);
    return () => window.removeEventListener("resize", updateGridDimensions);
  }, [updateGridDimensions]);

  React.useEffect(() => {
    targetPointRef.current = activePoint ?? null;

    if (!activePoint) {
      stopAnimation();
      animatedPointRef.current = null;
      setAnimatedPoint(null);
      return;
    }

    if (!animatedPointRef.current) {
      animatedPointRef.current = activePoint;
      setAnimatedPoint(activePoint);
    }

    if (animationFrameRef.current === null) {
      animationFrameRef.current = window.requestAnimationFrame(animatePoint);
    }
  }, [activePoint, animatePoint, stopAnimation]);

  React.useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  React.useLayoutEffect(() => {
    updateCellMetrics();
  }, [gridDimensions, updateCellMetrics]);

  const interactionTiers = React.useMemo(() => {
    if (!animatedPoint || cellMetrics.length === 0) {
      return new Map<string, InteractionTier>();
    }

    const tiers = new Map<string, InteractionTier>();
    const coreRadius = hexagonWidth * 0.8;
    const nearRadius = hexagonWidth * 1.5;
    const farRadius = hexagonWidth * 2.2;

    for (const metric of cellMetrics) {
      const distance = Math.hypot(
        metric.centerX - animatedPoint.x,
        metric.centerY - animatedPoint.y,
      );

      if (distance <= coreRadius) {
        tiers.set(metric.key, "core");
      } else if (distance <= nearRadius) {
        tiers.set(metric.key, "near");
      } else if (distance <= farRadius) {
        tiers.set(metric.key, "far");
      }
    }

    return tiers;
  }, [animatedPoint, cellMetrics, hexagonWidth]);

  return (
    <div
      data-slot="hexagon-background"
      ref={rootRef}
      className={cn(
        "relative size-full overflow-hidden dark:bg-neutral-900 bg-neutral-100",
        className,
      )}
      {...props}
    >
      <style>{`:root { --hexagon-margin: ${hexagonMargin}px; }`}</style>
      <div className="absolute top-0 left-0 size-full overflow-hidden">
        {Array.from({ length: gridDimensions.rows }).map((_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            style={{
              marginTop: computedMarginTop,
              marginLeft:
                ((rowIndex + 1) % 2 === 0
                  ? evenRowMarginLeft
                  : oddRowMarginLeft) - 10,
            }}
            className="inline-flex"
          >
            {Array.from({ length: gridDimensions.columns }).map(
              (_, colIndex) => {
                const key = `hexagon-${rowIndex}-${colIndex}`;

                return (
                  <div
                    key={key}
                    data-intensity={interactionTiers.get(key) ?? "idle"}
                    {...hexagonProps}
                    ref={(node) => {
                      if (node) {
                        cellRefs.current.set(key, node);
                        return;
                      }

                      cellRefs.current.delete(key);
                    }}
                    style={{
                      width: hexagonWidth,
                      height: hexagonHeight,
                      marginLeft: hexagonMargin,
                      ...hexagonProps?.style,
                    }}
                    className={cn(
                      "relative transition-transform duration-300 ease-out",
                      "[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]",
                      "before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full dark:before:bg-neutral-950 before:bg-white before:opacity-100 before:transition-[background-color,opacity,transform] before:duration-300 before:ease-out",
                      "after:content-[''] after:absolute after:inset-(--hexagon-margin) dark:after:bg-neutral-950 after:bg-white after:transition-[background-color,opacity,transform] after:duration-300 after:ease-out",
                      "after:[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]",
                      "hover:scale-[1.01] hover:before:bg-neutral-200 dark:hover:before:bg-neutral-800 hover:before:opacity-100 dark:hover:after:bg-neutral-900 hover:after:bg-neutral-100 hover:after:opacity-100",
                      "data-[intensity=far]:scale-[1.003] data-[intensity=far]:before:bg-neutral-200 dark:data-[intensity=far]:before:bg-neutral-800 data-[intensity=far]:before:opacity-50 dark:data-[intensity=far]:after:bg-neutral-900 data-[intensity=far]:after:bg-neutral-100 data-[intensity=far]:after:opacity-60",
                      "data-[intensity=near]:scale-[1.008] data-[intensity=near]:before:bg-neutral-200 dark:data-[intensity=near]:before:bg-neutral-800 data-[intensity=near]:before:opacity-80 dark:data-[intensity=near]:after:bg-neutral-900 data-[intensity=near]:after:bg-neutral-100 data-[intensity=near]:after:opacity-85",
                      "data-[intensity=core]:scale-[1.012] data-[intensity=core]:before:bg-neutral-200 dark:data-[intensity=core]:before:bg-neutral-800 data-[intensity=core]:before:opacity-100 dark:data-[intensity=core]:after:bg-neutral-900 data-[intensity=core]:after:bg-neutral-100 data-[intensity=core]:after:opacity-100",
                      hexagonProps?.className,
                    )}
                  />
                );
              },
            )}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

export { HexagonBackground, type HexagonBackgroundProps };

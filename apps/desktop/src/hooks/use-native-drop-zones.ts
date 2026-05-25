import { useEffect, useMemo, useRef, useState } from "react";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

import type { DropPosition } from "@workspace/app-ui/components/ui/drop-overlay/index";

export type NativeDropZone = {
  id: string;
  type: string;
  element: HTMLElement;
};

type NativeDropZonePayload =
  | {
      type: "enter" | "over";
      paths: string[];
      position: DropPosition;
      zone: NativeDropZone | null;
    }
  | {
      type: "drop";
      paths: string[];
      position: DropPosition;
      zone: NativeDropZone | null;
    }
  | { type: "leave"; paths: string[]; position: null; zone: null };

type UseNativeDropZonesOptions = {
  enabled?: boolean;
  selector?: string;
  onEvent?: (payload: NativeDropZonePayload) => void | Promise<void>;
};

const DEFAULT_SELECTOR = "[data-drop-id][data-drop-type]";

function toLogicalPosition(pos: { x: number; y: number }): DropPosition {
  return {
    x: pos.x / window.devicePixelRatio,
    y: pos.y / window.devicePixelRatio,
  };
}

function getDropZoneAtPosition(
  position: DropPosition,
  selector: string,
): NativeDropZone | null {
  const element = document.elementFromPoint(position.x, position.y);
  const dropElement = element?.closest<HTMLElement>(selector);

  if (!dropElement?.dataset.dropId || !dropElement.dataset.dropType) {
    return null;
  }

  return {
    id: dropElement.dataset.dropId,
    type: dropElement.dataset.dropType,
    element: dropElement,
  };
}

export function useNativeDropZones({
  enabled = true,
  selector = DEFAULT_SELECTOR,
  onEvent,
}: UseNativeDropZonesOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeDropId, setActiveDropId] = useState<string | null>(null);
  const [activeDropType, setActiveDropType] = useState<string | null>(null);
  const onEventRef = useRef(onEvent);
  const draggedPathsRef = useRef<string[]>([]);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!enabled) {
      setIsDragging(false);
      setActiveDropId(null);
      setActiveDropType(null);
      return;
    }

    let isCancelled = false;
    let unlistenFn: (() => void) | undefined;

    const emit = async (payload: NativeDropZonePayload) => {
      await onEventRef.current?.(payload);
    };

    const setupListener = async () => {
      const appWindow = getCurrentWebviewWindow();

      const unlisten = await appWindow.onDragDropEvent(async (event) => {
        if (isCancelled) return;

        const payload = event.payload;

        if (payload.type === "leave") {
          draggedPathsRef.current = [];
          setIsDragging(false);
          setActiveDropId(null);
          setActiveDropType(null);
          await emit({ type: "leave", paths: [], position: null, zone: null });
          return;
        }

        const position = toLogicalPosition(payload.position);
        const zone = getDropZoneAtPosition(position, selector);

        if (payload.type === "enter" || payload.type === "over") {
          if (payload.type === "enter") {
            draggedPathsRef.current = payload.paths;
          }

          setIsDragging(true);
          setActiveDropId(zone?.id ?? null);
          setActiveDropType(zone?.type ?? null);
          await emit({
            type: payload.type,
            paths: draggedPathsRef.current,
            position,
            zone,
          });
          return;
        }

        if (payload.type === "drop") {
          draggedPathsRef.current = [];
          setIsDragging(false);
          setActiveDropId(null);
          setActiveDropType(null);
          await emit({ type: "drop", paths: payload.paths, position, zone });
        }
      });

      if (isCancelled) {
        unlisten();
      } else {
        unlistenFn = unlisten;
      }
    };

    setupListener();

    return () => {
      isCancelled = true;
      unlistenFn?.();
    };
  }, [enabled, selector]);

  return useMemo(
    () => ({
      isDragging,
      activeDropId,
      activeDropType,
    }),
    [activeDropId, activeDropType, isDragging],
  );
}

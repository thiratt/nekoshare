import { useCallback, useEffect, useRef, useState } from "react";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export interface DragState {
  isDragging: boolean;
  files: string[];
}

export interface DropPosition {
  x: number;
  y: number;
}

interface UseFileDropOptions {
  onDrop?: (files: string[], position: DropPosition) => void;
  onPositionChange?: (position: DropPosition) => void;
  throttleMs?: number;
}

export function useFileDrop(options: UseFileDropOptions = {}) {
  const { onDrop, onPositionChange, throttleMs = 16 } = options;

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    files: [],
  });

  const positionRef = useRef<DropPosition | null>(null);
  const lastThrottleRef = useRef<number>(0);
  const onPositionChangeRef = useRef(onPositionChange);
  const onDropRef = useRef(onDrop);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
    onDropRef.current = onDrop;
  });

  const toLogicalPosition = useCallback(
    (pos: { x: number; y: number }): DropPosition => ({
      x: pos.x / window.devicePixelRatio,
      y: pos.y / window.devicePixelRatio,
    }),
    [],
  );

  useEffect(() => {
    let isCancelled = false;
    let unlistenFn: (() => void) | undefined;

    const setupListener = async () => {
      const appWindow = getCurrentWebviewWindow();

      const unlisten = await appWindow.onDragDropEvent((event) => {
        if (isCancelled) return;

        const payload = event.payload;

        // console.log("Event Type:", payload.type);

        if (payload.type === "enter") {
          setDragState({ isDragging: true, files: payload.paths });
          positionRef.current = toLogicalPosition(payload.position);
        } else if (payload.type === "over") {
          const now = performance.now();
          const logicalPos = toLogicalPosition(payload.position);
          positionRef.current = logicalPos;

          if (now - lastThrottleRef.current >= throttleMs) {
            lastThrottleRef.current = now;
            onPositionChangeRef.current?.(logicalPos);
          }
        } else if (payload.type === "drop") {
          console.log("Tauri File Dropped: ", payload);
          const logicalPos = toLogicalPosition(payload.position);
          positionRef.current = logicalPos;
          setDragState({ isDragging: false, files: [] });
          onDropRef.current?.(payload.paths, logicalPos);
        } else if (payload.type === "leave") {
          positionRef.current = null;
          setDragState({ isDragging: false, files: [] });
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
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [throttleMs, toLogicalPosition]);

  return {
    ...dragState,
    positionRef,
  };
}

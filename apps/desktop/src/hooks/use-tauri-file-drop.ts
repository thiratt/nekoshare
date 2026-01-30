import { useCallback, useEffect, useRef } from "react";

import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { stat } from "@tauri-apps/plugin-fs";

import {
  createFileEntry,
  type DropPosition,
  type FileEntry,
  useDropEventHandlers,
  useDropOverlayActions,
} from "@workspace/app-ui/components/ui/drop-overlay/index";

interface UseTauriFileDropOptions {
  enabled?: boolean;
}

export function useTauriFileDrop(options: UseTauriFileDropOptions = {}) {
  const { enabled = true } = options;

  const handlers = useDropEventHandlers();
  const { addFiles, setIsExpanded } = useDropOverlayActions();

  const handlersRef = useRef(handlers);
  const addFilesRef = useRef(addFiles);
  const setIsExpandedRef = useRef(setIsExpanded);

  useEffect(() => {
    handlersRef.current = handlers;
    addFilesRef.current = addFiles;
    setIsExpandedRef.current = setIsExpanded;
  });

  const toLogicalPosition = useCallback(
    (pos: { x: number; y: number }): DropPosition => ({
      x: pos.x / window.devicePixelRatio,
      y: pos.y / window.devicePixelRatio,
    }),
    [],
  );

  const resolveFileEntries = useCallback(
    async (paths: string[]): Promise<FileEntry[]> => {
      const promises = paths.map(async (path) => {
        try {
          const fileStat = await stat(path);
          return createFileEntry(path, fileStat.size);
        } catch (error) {
          console.error(`Failed to get stats for ${path}:`, error);
          return createFileEntry(path, 0);
        }
      });

      return Promise.all(promises);
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;

    let isCancelled = false;
    let unlistenFn: (() => void) | undefined;

    const setupListener = async () => {
      const appWindow = getCurrentWebviewWindow();

      const unlisten = await appWindow.onDragDropEvent(async (event) => {
        if (isCancelled) return;

        const payload = event.payload;
        const { onDragStart, onDragEnd, onPositionChange, onDrop } =
          handlersRef.current;

        switch (payload.type) {
          case "enter": {
            const position = toLogicalPosition(payload.position);
            onDragStart(payload.paths);
            onPositionChange(position);
            break;
          }

          case "over": {
            const position = toLogicalPosition(payload.position);
            onPositionChange(position);
            break;
          }

          case "drop": {
            const position = toLogicalPosition(payload.position);
            onDrop(payload.paths, position);
            break;
          }

          case "leave": {
            onDragEnd();
            break;
          }
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
  }, [enabled, toLogicalPosition, resolveFileEntries]);
}

export default useTauriFileDrop;

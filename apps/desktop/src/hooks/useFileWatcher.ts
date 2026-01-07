import { useEffect, useRef } from "react";

import { type WatchEvent, watchImmediate } from "@tauri-apps/plugin-fs";

export type WatchEventType = "create" | "modify" | "remove" | "any";

export interface WatchCallback {
  (event: { type: WatchEventType; paths: string[] }): void;
}

interface UseFileWatcherOptions {
  enabled?: boolean;
  debounceMs?: number;
}

function normalizeEventType(event: WatchEvent): WatchEventType {
  const { type } = event;

  if (typeof type === "object" && type !== null) {
    if ("modify" in type) {
      if (type.modify.kind === "rename") {
        return "remove";
      }
      return "modify";
    }

    if ("create" in type) return "create";
    if ("remove" in type) return "remove";
    if ("rename" in type) return "remove";
  }

  return "any";
}

export function useFileWatcher(
  path: string | null | undefined,
  callback: WatchCallback,
  options: UseFileWatcherOptions = {},
): void {
  const { enabled = true, debounceMs = 100 } = options;

  const callbackRef = useRef(callback);
  const unwatchRef = useRef<(() => void) | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    isMountedRef.current = true;
    let isUnmountedLocal = false;
    let shouldAbortImmediately = false;

    if (!enabled || !path) {
      return;
    }

    const setupWatcher = async () => {
      try {
        const unwatch = await watchImmediate(path, (event) => {
          const eventType = normalizeEventType(event);
          const paths = event.paths.map((p) => String(p));

          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              callbackRef.current({ type: eventType, paths });
            }
          }, debounceMs);

          if (eventType === "remove") {
            if (unwatchRef.current) {
              unwatchRef.current();
              unwatchRef.current = null;
            } else {
              shouldAbortImmediately = true;
            }
          }
        });

        if (
          isUnmountedLocal ||
          !isMountedRef.current ||
          shouldAbortImmediately
        ) {
          unwatch();
        } else {
          unwatchRef.current = unwatch;
        }
      } catch (error) {
        console.error("[useFileWatcher] Failed to set up watcher:", error);
      }
    };

    setupWatcher();

    const performCleanup = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (unwatchRef.current) {
        unwatchRef.current();
        unwatchRef.current = null;
      }
    };

    const handleBeforeUnload = () => {
      performCleanup();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isUnmountedLocal = true;
      isMountedRef.current = false;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      performCleanup();
    };
  }, [path, enabled, debounceMs]);
}

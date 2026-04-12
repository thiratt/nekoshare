import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useSetGlobalLoading } from "@workspace/app-ui/context/nekoshare";

import { useFileWatcher } from "@/hooks/useFileWatcher";
import { configFileExists, useStore } from "@/hooks/useStore";
import {
  type AppConfig,
  type DesktopStorageAdapter,
  useDesktopConfig,
  useDesktopError,
  useDesktopParentPath,
  useDesktopStatus,
  useDesktopStore,
  useIsAppReady,
  useNeedsSetup,
} from "@/lib/store/desktop";

interface NSDesktopContextValue {
  config: AppConfig;
  status: "loading" | "ready" | "needs-setup";
  isReady: boolean;
  needsSetup: boolean;
  error: Error | null;
  initComplete: boolean;
  isMaximized: boolean;
  isSnapHover: boolean;
  setFileLocation: (path: string) => Promise<void>;
  clearConfig: () => Promise<void>;
  refresh: () => Promise<void>;
  minimize: () => void;
  toggleMaximize: () => void;
  close: () => void;
}

const NSDesktopContext = createContext<NSDesktopContextValue | null>(null);

const INIT_TIMEOUT_MS = 3000;
const CONFIG_KEY = "appConfig";
const SNAP_LAYOUT_TARGET_SELECTOR = '[data-desktop-window-control="maximize"]';

const getStoreActions = () => useDesktopStore.getState();

function isSnapLayoutTargetInteractive(): boolean {
  const target = document.querySelector<HTMLElement>(
    SNAP_LAYOUT_TARGET_SELECTOR,
  );
  if (!target) return false;

  const style = window.getComputedStyle(target);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.pointerEvents === "none" ||
    target.matches(":disabled") ||
    target.getAttribute("aria-disabled") === "true"
  ) {
    return false;
  }

  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  const hitTarget = document.elementFromPoint(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );

  return hitTarget?.closest(SNAP_LAYOUT_TARGET_SELECTOR) === target;
}

export function NSDesktopProvider({
  initialMaximized,
  children,
}: {
  initialMaximized: boolean;
  children: ReactNode;
}) {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(initialMaximized);
  const [isSnapHover, setIsSnapHover] = useState(false);
  const setGlobalLoading = useSetGlobalLoading();

  const config = useDesktopConfig();
  const status = useDesktopStatus();
  const error = useDesktopError();
  const parentPath = useDesktopParentPath();
  const isReady = useIsAppReady();
  const needsSetup = useNeedsSetup();

  const {
    get,
    set,
    isLoading: isStoreLoading,
    store: tauriStore,
    configFilePath,
    ensureConfigExists,
    reload: reloadStore,
  } = useStore();

  const initCompleteRef = useRef(false);
  const initComplete = status !== "loading";

  const storageAdapter = useMemo<DesktopStorageAdapter | null>(() => {
    if (isStoreLoading) return null;

    return {
      get,
      set,
      ensureConfigExists,
      reload: reloadStore,
      configFileExists,
    };
  }, [get, set, ensureConfigExists, reloadStore, isStoreLoading]);

  useEffect(() => {
    if (!storageAdapter || initCompleteRef.current) return;

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled && status === "loading") {
        console.warn("[NSDesktopProvider] Init timeout, forcing needs-setup");
        useDesktopStore.setState({
          config: { fileLocation: null },
          status: "needs-setup",
          error: null,
        });
        setGlobalLoading(false);
      }
    }, INIT_TIMEOUT_MS);

    const runInit = async () => {
      try {
        await getStoreActions().init(storageAdapter);
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          initCompleteRef.current = true;
          setGlobalLoading(false);
        }
      }
    };

    void runInit();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [storageAdapter, status, setGlobalLoading]);

  useEffect(() => {
    if (!tauriStore) return;

    let unsubscribePromise: Promise<() => void> | null = null;

    const setup = async () => {
      unsubscribePromise = tauriStore.onChange<AppConfig>((key, value) => {
        if (key === CONFIG_KEY) {
          getStoreActions().syncFromTauriStore(value ?? null);
        }
      });
    };

    void setup();

    return () => {
      unsubscribePromise?.then((unsub) => unsub());
    };
  }, [tauriStore]);

  const handleConfigFileChange = useCallback(() => {
    if (storageAdapter) {
      getStoreActions().handleConfigFileChange(storageAdapter);
    }
  }, [storageAdapter]);

  useFileWatcher(configFilePath, handleConfigFileChange);

  const handleParentDirChange = useCallback(
    (event: { type: string; paths: string[] }) => {
      if (event.type === "remove") {
        getStoreActions().handleParentDirectoryRemoval(event.paths);
      }
    },
    [],
  );

  useFileWatcher(parentPath, handleParentDirChange, {
    enabled: !!parentPath && status === "ready",
  });

  useEffect(() => {
    let animationFrameId: number | null = null;
    let lastEnabled: boolean | null = null;
    let disposed = false;

    const setSnapLayoutEnabled = (enabled: boolean) => {
      if (!enabled) {
        setIsSnapHover(false);
      }

      void invoke("set_snap_layout_enabled", { enabled }).catch((error) => {
        console.error("Failed to update snap layout state", error);
      });
    };

    const syncSnapLayoutState = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        if (disposed) return;

        const enabled = isSnapLayoutTargetInteractive();
        if (lastEnabled === enabled) return;

        lastEnabled = enabled;
        setSnapLayoutEnabled(enabled);
      });
    };

    const observer = new MutationObserver(syncSnapLayoutState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "aria-disabled",
        "aria-hidden",
        "aria-modal",
        "class",
        "data-state",
        "data-slot",
        "hidden",
        "style",
      ],
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", syncSnapLayoutState);
    window.addEventListener("scroll", syncSnapLayoutState, true);
    window.addEventListener("transitionend", syncSnapLayoutState, true);
    syncSnapLayoutState();

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", syncSnapLayoutState);
      window.removeEventListener("scroll", syncSnapLayoutState, true);
      window.removeEventListener("transitionend", syncSnapLayoutState, true);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      setSnapLayoutEnabled(true);
    };
  }, []);

  const setFileLocation = useCallback(
    async (path: string): Promise<void> => {
      if (!storageAdapter) {
        throw new Error("Storage not initialized");
      }
      await getStoreActions().setFileLocation(path, storageAdapter);
    },
    [storageAdapter],
  );

  const clearConfig = useCallback(async (): Promise<void> => {
    if (!storageAdapter) return;
    await getStoreActions().clearConfig(storageAdapter);
  }, [storageAdapter]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!storageAdapter) return;
    await getStoreActions().refresh(storageAdapter);
  }, [storageAdapter]);

  useEffect(() => {
    const unlistenFns: Array<() => void> = [];

    const setup = async () => {
      unlistenFns.push(
        await appWindow.listen<boolean>("snap-hover", (event) => {
          setIsSnapHover(event.payload);
        }),
      );

      unlistenFns.push(
        await appWindow.listen<boolean>("window-maximized", (event) => {
          setIsMaximized(event.payload);
        }),
      );

      unlistenFns.push(
        await appWindow.listen<{ focused: boolean; maximized: boolean }>(
          "window-state",
          (event) => {
            setIsMaximized(event.payload.maximized);
          },
        ),
      );
    };

    void setup();

    return () => {
      for (const unlisten of unlistenFns) {
        unlisten();
      }
    };
  }, [appWindow]);

  const contextValue = useMemo<NSDesktopContextValue>(
    () => ({
      config,
      status,
      isReady,
      needsSetup,
      error,
      initComplete,
      isMaximized,
      isSnapHover,
      setFileLocation,
      clearConfig,
      refresh,
      minimize: () => {
        void appWindow.minimize();
      },
      toggleMaximize: () => {
        void appWindow.toggleMaximize();
      },
      close: () => {
        void appWindow.close();
      },
    }),
    [
      config,
      status,
      isReady,
      needsSetup,
      error,
      initComplete,
      isMaximized,
      isSnapHover,
      setFileLocation,
      clearConfig,
      refresh,
      appWindow,
    ],
  );

  return (
    <NSDesktopContext.Provider value={contextValue}>
      {children}
    </NSDesktopContext.Provider>
  );
}

export function useNSDesktop() {
  const context = useContext(NSDesktopContext);
  if (!context) {
    throw new Error("useNSDesktop must be used within an NSDesktopProvider");
  }
  return context;
}

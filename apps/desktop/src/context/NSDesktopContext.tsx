import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

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
  setFileLocation: (path: string) => Promise<void>;
  clearConfig: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NSDesktopContext = createContext<NSDesktopContextValue | null>(null);

const INIT_TIMEOUT_MS = 3000;
const CONFIG_KEY = "appConfig";

const getStoreActions = () => useDesktopStore.getState();

export function NSDesktopProvider({ children }: { children: ReactNode }) {
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

    runInit();

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

    setup();

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

  const contextValue = useMemo<NSDesktopContextValue>(
    () => ({
      config,
      status,
      isReady,
      needsSetup,
      error,
      initComplete,
      setFileLocation,
      clearConfig,
      refresh,
    }),
    [
      config,
      status,
      isReady,
      needsSetup,
      error,
      initComplete,
      setFileLocation,
      clearConfig,
      refresh,
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

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { dirname } from "@tauri-apps/api/path";
import { stat } from "@tauri-apps/plugin-fs";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";

import { useFileWatcher } from "@/hooks/useFileWatcher";
import { configFileExists, useStore } from "@/hooks/useStore";

export interface AppConfig {
  fileLocation: string | null;
}

type ConfigStatus = "loading" | "ready" | "needs-setup";

interface NSDesktopContextValue {
  config: AppConfig;
  status: ConfigStatus;
  isReady: boolean;
  needsSetup: boolean;
  error: Error | null;
  setFileLocation: (path: string) => Promise<void>;
  clearConfig: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NSDesktopContext = createContext<NSDesktopContextValue | null>(null);

const DEFAULT_CONFIG: AppConfig = {
  fileLocation: null,
};

const CONFIG_KEY = "appConfig";
const INIT_TIMEOUT_MS = 2000;

async function isValidDirectory(
  path: string | null | undefined,
): Promise<boolean> {
  if (!path) return false;
  try {
    const pathStat = await stat(path);
    return pathStat.isDirectory;
  } catch {
    return false;
  }
}

function deriveStatus(config: AppConfig, isPathValid: boolean): ConfigStatus {
  if (!config.fileLocation) return "needs-setup";
  if (!isPathValid) return "needs-setup";
  return "ready";
}

export function NSDesktopProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [status, setStatus] = useState<ConfigStatus>("loading");
  const [error, setError] = useState<Error | null>(null);
  const [parentPath, setParentPath] = useState<string | null>(null);

  const { setGlobalLoading } = useNekoShare();
  const {
    get,
    set,
    isLoading: isStoreLoading,
    store,
    configFilePath,
    ensureConfigExists,
    reload: reloadStore,
  } = useStore();

  const isMountedRef = useRef(true);
  const initCompletedRef = useRef(false);

  const finishLoading = useCallback(() => {
    if (isMountedRef.current) {
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const resetToDefaults = useCallback(async () => {
    try {
      await set(CONFIG_KEY, DEFAULT_CONFIG);
    } catch (err) {
      console.error(
        "[NSDesktopProvider] Failed to reset config to defaults:",
        err,
      );
    }

    if (isMountedRef.current) {
      setConfig(DEFAULT_CONFIG);
      setStatus("needs-setup");
    }
  }, [set]);

  const validateAndUpdateStatus = useCallback(
    async (cfg: AppConfig): Promise<boolean> => {
      if (!cfg.fileLocation) {
        if (isMountedRef.current) setStatus("needs-setup");
        return false;
      }

      const valid = await isValidDirectory(cfg.fileLocation);

      if (isMountedRef.current) {
        setStatus(deriveStatus(cfg, valid));
      }

      return valid;
    },
    [],
  );

  const loadConfig = useCallback(async (): Promise<AppConfig> => {
    try {
      await ensureConfigExists();
      await reloadStore();

      const stored = await get<AppConfig>(CONFIG_KEY);

      if (!stored || stored.fileLocation === undefined) {
        await set(CONFIG_KEY, DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      }

      return stored;
    } catch {
      try {
        await set(CONFIG_KEY, DEFAULT_CONFIG);
      } catch (err) {
        console.error(
          "[NSDesktopProvider] Failed to reset config to defaults:",
          err,
        );
      }
      return DEFAULT_CONFIG;
    }
  }, [get, set, ensureConfigExists, reloadStore]);

  const setFileLocation = useCallback(
    async (path: string): Promise<void> => {
      const valid = await isValidDirectory(path);

      if (!valid) {
        throw new Error("Invalid path: directory does not exist");
      }

      const newConfig: AppConfig = { fileLocation: path };
      await set(CONFIG_KEY, newConfig);

      if (isMountedRef.current) {
        setConfig(newConfig);
        setStatus("ready");
        setError(null);
      }
    },
    [set],
  );

  const clearConfig = useCallback(async (): Promise<void> => {
    await resetToDefaults();
  }, [resetToDefaults]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      setError(null);
      const cfg = await loadConfig();

      if (isMountedRef.current) {
        setConfig(cfg);
        await validateAndUpdateStatus(cfg);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to refresh");
      if (isMountedRef.current) {
        setError(error);
        setStatus("needs-setup");
      }
    }
  }, [loadConfig, validateAndUpdateStatus]);

  const handleConfigFileChange = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const fileExists = await configFileExists();
      if (!fileExists) {
        await resetToDefaults();
        return;
      }
      await refresh();
    } catch {
      await resetToDefaults();
    }
  }, [refresh, resetToDefaults]);

  useEffect(() => {
    if (isStoreLoading || initCompletedRef.current) return;
    initCompletedRef.current = true;

    const timeoutId = setTimeout(() => {
      if (isMountedRef.current && status === "loading") {
        setConfig(DEFAULT_CONFIG);
        setStatus("needs-setup");
        finishLoading();
      }
    }, INIT_TIMEOUT_MS);

    const init = async () => {
      try {
        const cfg = await loadConfig();
        if (isMountedRef.current) {
          setConfig(cfg);
          await validateAndUpdateStatus(cfg);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setConfig(DEFAULT_CONFIG);
          setStatus("needs-setup");
          setError(err instanceof Error ? err : new Error("Init failed"));
        }
      } finally {
        clearTimeout(timeoutId);
        finishLoading();
      }
    };

    init();
    return () => clearTimeout(timeoutId);
  }, [
    isStoreLoading,
    loadConfig,
    validateAndUpdateStatus,
    finishLoading,
    status,
  ]);

  useEffect(() => {
    if (!store) return;
    let unsubscribePromise: Promise<() => void> | null = null;

    const setup = async () => {
      unsubscribePromise = store.onChange<AppConfig>((key, value) => {
        if (key === CONFIG_KEY && isMountedRef.current) {
          const newConfig = value ?? DEFAULT_CONFIG;
          setConfig(newConfig);
          validateAndUpdateStatus(newConfig);
        }
      });
    };

    setup();
    return () => {
      unsubscribePromise?.then((unsub) => unsub());
    };
  }, [store, validateAndUpdateStatus]);

  useEffect(() => {
    const findParent = async () => {
      if (config.fileLocation) {
        try {
          const parent = await dirname(config.fileLocation);
          setParentPath(parent);
        } catch {
          setParentPath(null);
        }
      } else {
        setParentPath(null);
      }
    };
    findParent();
  }, [config.fileLocation]);

  useFileWatcher(
    configFilePath,
    useCallback(() => {
      handleConfigFileChange();
    }, [handleConfigFileChange]),
  );

  useFileWatcher(
    parentPath,
    useCallback(
      async (event) => {
        if (
          event.type === "remove" &&
          config.fileLocation &&
          isMountedRef.current
        ) {
          const isTargetDeleted = event.paths.some(
            (p) =>
              p.includes(config.fileLocation!) ||
              config.fileLocation!.includes(p),
          );

          if (isTargetDeleted) {
            const exists = await isValidDirectory(config.fileLocation);
            if (!exists && isMountedRef.current) {
              setStatus("needs-setup");
            }
          }
        }
      },
      [config.fileLocation],
    ),
    { enabled: !!parentPath && status === "ready" },
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return (
    <NSDesktopContext.Provider
      value={{
        config,
        status,
        isReady: status === "ready",
        needsSetup: status === "needs-setup",
        error,
        setFileLocation,
        clearConfig,
        refresh,
      }}
    >
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

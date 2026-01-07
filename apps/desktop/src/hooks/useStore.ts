import { useCallback, useEffect, useRef, useState } from "react";

import { appDataDir, join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/plugin-fs";
import { load, type Store } from "@tauri-apps/plugin-store";

const APP_CONFIG_FILE = "nekoshare.json";

export async function getConfigFilePath(): Promise<string> {
  const dataDir = await appDataDir();
  return join(dataDir, APP_CONFIG_FILE);
}

export async function configFileExists(): Promise<boolean> {
  try {
    const configPath = await getConfigFilePath();
    return exists(configPath);
  } catch {
    return false;
  }
}

export async function getStoreValue<T>(key: string): Promise<T | null> {
  const store = await load(APP_CONFIG_FILE);
  await store.reload();
  const value = await store.get<T>(key);
  return value ?? null;
}

interface UseStoreReturn {
  store: Store | null;
  isLoading: boolean;
  error: Error | null;
  configFilePath: string | null;
  set: (key: string, value: unknown) => Promise<void>;
  get: <T>(key: string) => Promise<T | null>;
  reload: () => Promise<void>;
  ensureConfigExists: () => Promise<void>;
}

export function useStore(storeName?: string): UseStoreReturn {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [configFilePath, setConfigFilePath] = useState<string | null>(null);

  const targetFile = storeName || APP_CONFIG_FILE;
  const isMountedRef = useRef(true);

  const set = useCallback(
    async (key: string, value: unknown) => {
      if (!store) return;
      await store.set(key, value);
      await store.save();
    },
    [store],
  );

  const get = useCallback(
    async <T>(key: string): Promise<T | null> => {
      if (!store) return null;
      await store.reload();
      const value = await store.get<T>(key);
      return value ?? null;
    },
    [store],
  );

  const reload = useCallback(async () => {
    if (!store) return;
    await store.reload();
  }, [store]);

  const ensureConfigExists = useCallback(async () => {
    if (!store) return;

    try {
      const fileExists = await configFileExists();
      if (!fileExists) {
        console.log("[useStore] Config file missing, recreating...");
        await store.save();
      }
    } catch (err) {
      console.error("[useStore] Error ensuring config exists:", err);
    }
  }, [store]);

  useEffect(() => {
    isMountedRef.current = true;
    let mounted = true;

    const initStore = async () => {
      try {
        const filePath = await getConfigFilePath();
        if (mounted) setConfigFilePath(filePath);

        const s = await load(targetFile);
        if (mounted) setStore(s);
      } catch (err) {
        if (mounted)
          setError(
            err instanceof Error ? err : new Error("Failed to load store"),
          );
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initStore();

    return () => {
      mounted = false;
      isMountedRef.current = false;
    };
  }, [targetFile]);

  return {
    store,
    isLoading,
    error,
    configFilePath,
    set,
    get,
    reload,
    ensureConfigExists,
  };
}

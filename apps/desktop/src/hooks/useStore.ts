import { useCallback, useEffect, useState } from "react";

import { load, type Store } from "@tauri-apps/plugin-store";

const APP_CONFIG_FILE = "nekoshare.json";

export async function getStoreValue<T>(key: string): Promise<T | null> {
  const store = await load(APP_CONFIG_FILE);
  await store.reload();
  const value = await store.get<T>(key);
  return value ?? null;
}

export function useStore(storeName?: string) {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const targetFile = storeName || APP_CONFIG_FILE;

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

  useEffect(() => {
    let mounted = true;
    const initStore = async () => {
      try {
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
    };
  }, [targetFile]);

  return { store, isLoading, error, set, get };
}

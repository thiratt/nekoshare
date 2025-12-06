import { load, Store } from "@tauri-apps/plugin-store";
import { useState, useEffect, useCallback } from "react";

const APP_CONFIG_FILE = "nekoshare.json";

function useStore(storeName?: string) {
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const set = useCallback(
    async (key: string, value: unknown) => {
      // if (!store) throw new Error("Store not loaded");
      if (!store) return;
      
      await store.set(key, value);
      await store.save();
    },
    [store],
  );

  const get = useCallback(
    async <T>(key: string): Promise<T | null> => {
      // if (!store) throw new Error("Store not loaded");
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
        const s = await load(storeName || APP_CONFIG_FILE);
        if (mounted) {
          setStore(s);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to load store"),
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    initStore();
    return () => {
      mounted = false;
    };
  }, [storeName]);

  return { store, isLoading, error, set, get };
}

export { useStore };

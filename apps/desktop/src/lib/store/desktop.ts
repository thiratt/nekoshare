import { dirname } from "@tauri-apps/api/path";
import { stat } from "@tauri-apps/plugin-fs";
import { create } from "zustand";

export interface AppConfig {
  fileLocation: string | null;
}

export type ConfigStatus = "loading" | "ready" | "needs-setup";

interface DesktopState {
  config: AppConfig;
  status: ConfigStatus;
  error: Error | null;
  parentPath: string | null;
}

interface DesktopActions {
  init: (storage: DesktopStorageAdapter) => Promise<void>;
  setFileLocation: (
    path: string,
    storage: DesktopStorageAdapter,
  ) => Promise<void>;
  clearConfig: (storage: DesktopStorageAdapter) => Promise<void>;
  refresh: (storage: DesktopStorageAdapter) => Promise<void>;
  handleConfigFileChange: (storage: DesktopStorageAdapter) => Promise<void>;
  handleParentDirectoryRemoval: (removedPaths: string[]) => Promise<void>;
  syncFromTauriStore: (newConfig: AppConfig | null) => Promise<void>;
}

export type DesktopStore = DesktopState & DesktopActions;

const CONFIG_KEY = "appConfig";

const DEFAULT_CONFIG: AppConfig = {
  fileLocation: null,
};

export interface DesktopStorageAdapter {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown) => Promise<void>;
  ensureConfigExists: () => Promise<void>;
  reload: () => Promise<void>;
  configFileExists: () => Promise<boolean>;
}

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

async function getParentPath(
  fileLocation: string | null,
): Promise<string | null> {
  if (!fileLocation) return null;
  try {
    return await dirname(fileLocation);
  } catch {
    return null;
  }
}

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  status: "loading",
  error: null,
  parentPath: null,

  init: async (storage) => {
    try {
      await storage.ensureConfigExists();
      await storage.reload();

      const stored = await storage.get<AppConfig>(CONFIG_KEY);

      if (!stored || stored.fileLocation === undefined) {
        await storage.set(CONFIG_KEY, DEFAULT_CONFIG);
        set({ config: DEFAULT_CONFIG, status: "needs-setup", error: null });
        return;
      }

      const isValid = await isValidDirectory(stored.fileLocation);
      const status = deriveStatus(stored, isValid);
      const parentPath = await getParentPath(stored.fileLocation);

      set({ config: stored, status, error: null, parentPath });
    } catch (err) {
      console.error("[DesktopStore] Init failed:", err);

      try {
        await storage.set(CONFIG_KEY, DEFAULT_CONFIG);
      } catch (resetErr) {
        console.error("[DesktopStore] Failed to reset config:", resetErr);
      }

      set({
        config: DEFAULT_CONFIG,
        status: "needs-setup",
        error: err instanceof Error ? err : new Error("Init failed"),
      });
    }
  },

  setFileLocation: async (path, storage) => {
    const isValid = await isValidDirectory(path);

    if (!isValid) {
      throw new Error("Invalid path: directory does not exist");
    }

    const newConfig: AppConfig = { fileLocation: path };
    await storage.set(CONFIG_KEY, newConfig);

    const parentPath = await getParentPath(path);

    set({
      config: newConfig,
      status: "ready",
      error: null,
      parentPath,
    });
  },

  clearConfig: async (storage) => {
    try {
      await storage.set(CONFIG_KEY, DEFAULT_CONFIG);
    } catch (err) {
      console.error("[DesktopStore] Failed to clear config:", err);
    }

    set({
      config: DEFAULT_CONFIG,
      status: "needs-setup",
      error: null,
      parentPath: null,
    });
  },

  refresh: async (storage) => {
    try {
      await storage.reload();
      const stored = await storage.get<AppConfig>(CONFIG_KEY);
      const config = stored ?? DEFAULT_CONFIG;

      const isValid = await isValidDirectory(config.fileLocation);
      const status = deriveStatus(config, isValid);
      const parentPath = await getParentPath(config.fileLocation);

      set({ config, status, error: null, parentPath });
    } catch (err) {
      console.error("[DesktopStore] Refresh failed:", err);
      set({
        error: err instanceof Error ? err : new Error("Failed to refresh"),
        status: "needs-setup",
      });
    }
  },

  handleConfigFileChange: async (storage) => {
    try {
      const fileExists = await storage.configFileExists();

      if (!fileExists) {
        await get().clearConfig(storage);
        return;
      }

      await get().refresh(storage);
    } catch {
      await get().clearConfig(storage);
    }
  },

  handleParentDirectoryRemoval: async (removedPaths) => {
    const { config, status } = get();

    if (!config.fileLocation || status !== "ready") return;

    const isTargetDeleted = removedPaths.some(
      (p) =>
        p.includes(config.fileLocation!) || config.fileLocation!.includes(p),
    );

    if (isTargetDeleted) {
      const exists = await isValidDirectory(config.fileLocation);
      if (!exists) {
        set({ status: "needs-setup" });
      }
    }
  },

  syncFromTauriStore: async (newConfig) => {
    const config = newConfig ?? DEFAULT_CONFIG;
    const isValid = await isValidDirectory(config.fileLocation);
    const status = deriveStatus(config, isValid);
    const parentPath = await getParentPath(config.fileLocation);

    set({ config, status, parentPath });
  },
}));

export const useDesktopConfig = (): AppConfig =>
  useDesktopStore((s) => s.config);

export const useDesktopStatus = (): ConfigStatus =>
  useDesktopStore((s) => s.status);

export const useDesktopError = (): Error | null =>
  useDesktopStore((s) => s.error);

export const useDesktopParentPath = (): string | null =>
  useDesktopStore((s) => s.parentPath);

export const useIsAppReady = (): boolean =>
  useDesktopStore((s) => s.status === "ready");

export const useNeedsSetup = (): boolean =>
  useDesktopStore((s) => s.status === "needs-setup");

export const useIsLoading = (): boolean =>
  useDesktopStore((s) => s.status === "loading");

export const useFileLocation = (): string | null =>
  useDesktopStore((s) => s.config.fileLocation);

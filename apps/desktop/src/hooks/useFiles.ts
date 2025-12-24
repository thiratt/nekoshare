import { useCallback,useEffect, useState } from "react";

import { join } from "@tauri-apps/api/path";
import { readDir, stat } from "@tauri-apps/plugin-fs";

import { useStore } from "./useStore";

export interface FileMetadata {
  name: string;
  size: number;
  isFile: boolean;
  isDirectory: boolean;
  path: string;
  createdAt: Date | null;
  modifiedAt: Date | null;
  accessedAt: Date | null;
}

interface AppConfig {
  isSetup: boolean;
  fileLocation: string;
}

interface UseFilesReturn {
  files: FileMetadata[];
  loading: boolean;
  error: string | null;
  directoryPath?: string | null;
  refresh: () => Promise<void>;
}

function useFiles(): UseFilesReturn {
  const { get, isLoading: isStoreLoading } = useStore();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configPath, setConfigPath] = useState<string | null>(null);

  useEffect(() => {
    if (isStoreLoading) return;

    const loadConfig = async () => {
      try {
        const appConfig = await get<AppConfig>("appConfig");
        if (appConfig?.fileLocation) {
          setConfigPath(appConfig.fileLocation);
        } else {
          setError("No file location configured. Please complete setup.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load app config:", err);
        setError("Failed to load configuration");
        setLoading(false);
      }
    };

    loadConfig();
  }, [get, isStoreLoading]);

  const getFiles = useCallback(async () => {
    if (!configPath) return;

    setLoading(true);
    setError(null);

    try {
      const entries = await readDir(configPath);
      const filesWithMetadata = entries.map(async (entry) => {
        const filePath = await join(configPath, entry.name);
        const fileStat = await stat(filePath);
        return {
          name: entry.name,
          size: fileStat.size,
          isFile: fileStat.isFile,
          isDirectory: fileStat.isDirectory,
          path: filePath,
          createdAt: fileStat.birthtime ? new Date(fileStat.birthtime) : null,
          modifiedAt: fileStat.mtime ? new Date(fileStat.mtime) : null,
          accessedAt: fileStat.atime ? new Date(fileStat.atime) : null,
        } as FileMetadata;
      });
      const resolvedFiles = await Promise.all(filesWithMetadata);
      setFiles(resolvedFiles);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error reading directory";
      setError(errorMessage);
      console.error("Error reading directory:", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [configPath]);

  useEffect(() => {
    if (configPath) {
      getFiles();
    }
  }, [configPath, getFiles]);

  const refresh = useCallback(async () => {
    await getFiles();
  }, [getFiles]);

  return {
    files,
    loading,
    error,
    directoryPath: configPath,
    refresh,
  };
}

export { useFiles };

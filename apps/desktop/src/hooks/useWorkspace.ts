import { useCallback, useEffect, useRef, useState } from "react";

import { join } from "@tauri-apps/api/path";
import { readDir, stat } from "@tauri-apps/plugin-fs";

import { useFileWatcher } from "./useFileWatcher";

import { useNSDesktop } from "@/context/NSDesktopContext";

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

type WorkspaceStatus = "loading" | "ready" | "empty" | "unavailable";

interface UseWorkspaceReturn {
  files: FileMetadata[];
  status: WorkspaceStatus;
  directoryPath: string | null;
  error: string | null;
  refresh: () => Promise<void>;
}

async function readFilesFromDirectory(path: string): Promise<FileMetadata[]> {
  const entries = await readDir(path);

  const filePromises = entries.map(async (entry) => {
    const filePath = await join(path, entry.name);
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

  return Promise.all(filePromises);
}

export function useWorkspace(): UseWorkspaceReturn {
  const { config, status: configStatus, isReady } = useNSDesktop();

  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [status, setStatus] = useState<WorkspaceStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const lastPathRef = useRef<string | null>(null);

  const directoryPath = config.fileLocation;

  const loadFiles = useCallback(async () => {
    if (!directoryPath || !isMountedRef.current) {
      setFiles([]);
      setStatus("unavailable");
      return;
    }

    try {
      const loadedFiles = await readFilesFromDirectory(directoryPath);

      if (isMountedRef.current) {
        setFiles(loadedFiles);
        setStatus(loadedFiles.length > 0 ? "ready" : "empty");
        setError(null);
      }
    } catch (err) {
      console.error("[useWorkspace] Error loading files:", err);

      if (isMountedRef.current) {
        setFiles([]);
        setStatus("unavailable");
        setError(err instanceof Error ? err.message : "Failed to load files");
      }
    }
  }, [directoryPath]);

  const refresh = useCallback(async () => {
    await loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (configStatus === "loading") {
      setStatus("loading");
      return;
    }

    if (!isReady || !directoryPath) {
      setFiles([]);
      setStatus("unavailable");
      setError(null);
      return;
    }

    if (lastPathRef.current !== directoryPath) {
      lastPathRef.current = directoryPath;
      loadFiles();
    }
  }, [configStatus, isReady, directoryPath, loadFiles]);

  useFileWatcher(
    directoryPath,
    useCallback(() => {
      loadFiles();
    }, [loadFiles]),
    { enabled: isReady && !!directoryPath, debounceMs: 150 },
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    files,
    status,
    directoryPath,
    error,
    refresh,
  };
}

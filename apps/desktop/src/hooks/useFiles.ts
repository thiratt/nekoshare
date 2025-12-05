import { useState, useEffect, useCallback } from "react";

import { readDir, stat, BaseDirectory } from "@tauri-apps/plugin-fs";
import { dataDir, join } from "@tauri-apps/api/path";

const DEFAULT_FOLDER = "NekoShare";

interface UseFilesReturn {
  files: unknown[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function useFiles(): UseFilesReturn {
  const [files, setFiles] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getFiles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const entries = await readDir(DEFAULT_FOLDER, {
        baseDir: BaseDirectory.Data,
      });
      const filesWithMetadata = entries.map(async (entry) =>
        stat(await join(await dataDir(), DEFAULT_FOLDER, entry.name), {
          baseDir: BaseDirectory.Data,
        }),
      );
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
  }, []);

  useEffect(() => {
    getFiles();
  }, [getFiles]);

  const refresh = useCallback(async () => {
    await getFiles();
  }, [getFiles]);

  return {
    files,
    loading,
    error,
    refresh,
  };
}

export { useFiles };

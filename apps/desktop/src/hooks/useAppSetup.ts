import { useCallback, useEffect, useState } from "react";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";

import { useStore } from "@/hooks/useStore";

export interface AppConfig {
  isSetup: boolean;
  fileLocation: string;
}

interface UseAppSetupReturn {
  isSetup: boolean;
  isLoading: boolean;
  setIsSetup: (value: boolean) => void;
}

export function useAppSetup(): UseAppSetupReturn {
  const [isSetup, setIsSetupState] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { setGlobalLoading } = useNekoShare();
  const { get } = useStore();

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      try {
        setIsLoading(true);

        const appConfig = await get<AppConfig>("appConfig");

        if (isMounted) {
          setIsSetupState(appConfig?.isSetup ?? false);
        }
      } catch (error) {
        console.error("[useAppSetup] Failed to load config:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setGlobalLoading(false);
        }
      }
    };

    loadConfig();

    return () => {
      isMounted = false;
    };
  }, [get, setGlobalLoading]);

  const setIsSetup = useCallback((value: boolean) => {
    setIsSetupState(value);
  }, []);

  return {
    isSetup,
    setIsSetup,
    isLoading,
  };
}

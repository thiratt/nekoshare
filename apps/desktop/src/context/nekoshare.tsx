import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
} from "react";
// import { unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import { invoke } from "@tauri-apps/api/core";
// import { usePathname } from "next/navigation";
import LoadingOverlay from "@workspace/app-ui/components/global-loading";

import { AnimatePresence, motion } from "motion/react";
import { SettingPage } from "@workspace/app-ui/components/settings/index";
import { useTheme } from "@/libs/theme-provider";

interface NekoShareContextType {
  isGlobalLoading: boolean;
  setGlobalLoading: React.Dispatch<React.SetStateAction<boolean>>;
  mode: "home" | "setting";
  setMode: React.Dispatch<React.SetStateAction<"home" | "setting">>;
}

const NekoShareContext = createContext<NekoShareContextType | null>(null);

export const NekoShareProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isGlobalLoading, setGlobalLoading] = useState<boolean>(false);
  const [mode, setMode] = useState<"home" | "setting">("home");
  const { theme, setTheme } = useTheme();
  // const pathname = usePathname();

  // const shouldTrigger = useMemo(() => pathname.includes(`/home`), [pathname]);

  // const registerShortcuts = useCallback(async () => {
  // 	try {
  // 		await invoke("enable_keyhook");
  // 		toast.success("Shortcut registered successfully");
  // 	} catch {
  // 		toast.error("Failed to register shortcut");
  // 	}
  // }, []);

  // useEffect(() => {
  // 	if (shouldTrigger) {
  // 		registerShortcuts();
  // 	}

  // 	return () => {
  // 		unregisterAll().catch(toast.error);
  // 	};
  // }, [registerShortcuts, shouldTrigger]);

  const contextValue = useMemo<NekoShareContextType>(
    () => ({
      isGlobalLoading,
      setGlobalLoading,
      mode,
      setMode,
    }),
    [isGlobalLoading, mode],
  );

  return (
    <NekoShareContext.Provider value={contextValue}>
      <div className="h-screen overflow-hidden relative">
        <motion.div
          className="h-full"
          animate={{
            scale: mode === "home" ? 1 : 0.97,
            opacity: 1,
            y: mode === "home" ? 0 : -10,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
        <AnimatePresence mode="wait">
          {mode !== "home" && (
            <SettingPage setMode={setMode} xTheme={{ theme, setTheme }} />
          )}
        </AnimatePresence>
      </div>
      <LoadingOverlay loading={isGlobalLoading} />
    </NekoShareContext.Provider>
  );
};

export const useNekoShare = (): NekoShareContextType => {
  const context = useContext(NekoShareContext);
  if (!context) {
    throw new Error("useNekoShare must be used within a NekoShareProvider");
  }
  return context;
};

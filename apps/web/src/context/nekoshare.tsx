import React, { createContext, useContext, useState, useMemo } from "react";

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
        <AnimatePresence mode="wait">
          {mode === "setting" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: 0.15 }}
              className="flex fixed top-0 h-screen w-screen bg-black/10 backdrop-blur-xs inset-0"
            ></motion.div>
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

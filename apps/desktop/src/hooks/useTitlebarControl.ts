import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";

function useTitlebarControl() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const updateMaximizedState = async () => {
      try {
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      } catch (e) {
        console.error("Failed to check window state", e);
      }
    };

    updateMaximizedState();

    const unlistenPromise = appWindow.listen(
      "tauri://resize",
      updateMaximizedState,
    );

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [appWindow]);

  return {
    window: appWindow,
    isMaximized,
    minimize: () => appWindow.minimize(),
    toggleMaximize: () => appWindow.toggleMaximize(),
    close: () => appWindow.close(),
  };
}

export { useTitlebarControl };

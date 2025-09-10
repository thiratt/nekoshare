import { type JSX, useEffect, useMemo, useState } from "react";
import { Expand, Minus, Shrink, X } from "lucide-react";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
// import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";

enum WindowActionTitle {
  Minimize = "Minimize",
  Maximize = "Maximize",
  RestoreDown = "Restore Down",
  Close = "Close",
}

interface WindowAction {
  title: WindowActionTitle;
  icon: JSX.Element;
  className?: string;
  onClick: (window: Window) => Promise<void> | void;
  onMouseEnter?: (window: Window) => Promise<void> | void;
  ariaLabel: string;
}

function useTauriWindow() {
  const [window, setWindow] = useState<Window | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        const appWindow = getCurrentWindow();
        setWindow(appWindow);
        setIsMaximized(await appWindow.isMaximized());
      } catch (err) {
        // toast.error((err as Error).message);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    if (!window) return;

    let unlisten: () => void;

    const setupResizeListener = async () => {
      try {
        unlisten = await listen("tauri://resize", async () => {
          setIsMaximized(await window.isMaximized());
        });
      } catch (err) {
        // toast.error((err as Error).message);
      }
    };

    setupResizeListener();
    return () => unlisten?.();
  }, [window]);

  return { window, isMaximized };
}

function getWindowActions(isMaximized: boolean): WindowAction[] {
  return [
    {
      title: WindowActionTitle.Minimize,
      icon: <Minus />,
      onClick: (window) => window.minimize(),
      ariaLabel: "Minimize the window",
    },
    {
      title: isMaximized
        ? WindowActionTitle.RestoreDown
        : WindowActionTitle.Maximize,
      icon: isMaximized ? <Shrink /> : <Expand />,
      onClick: (window) => window.toggleMaximize(),
      onMouseEnter: (window) => {
        window.setFocus().then(() => {
          invoke("show_snap_overlay");
        });
      },
      ariaLabel: isMaximized ? "Restore window" : "Maximize window",
    },
    {
      title: WindowActionTitle.Close,
      icon: <X />,
      className:
        "rounded-tr-none hover:bg-destructive hover:text-white dark:hover:bg-destructive dark:hover:text-white",
      onClick: (window) => window.close(),
      ariaLabel: "Close the window",
    },
  ];
}

export function NavigationBarWindowControl({
  noMaximum,
}: {
  noMaximum?: boolean;
}) {
  const { window, isMaximized } = useTauriWindow();
  const actions = useMemo(() => getWindowActions(isMaximized), [isMaximized]);

  return (
    <div className="flex" aria-busy={!window}>
      {actions.map((action) => {
        if (
          noMaximum &&
          (action.title === WindowActionTitle.Maximize ||
            action.title === WindowActionTitle.RestoreDown)
        ) {
          return null;
        }

        return (
          <Button
            key={action.title}
            className={`w-[45px] dark:hover:bg-background ${action.className ?? ""}`}
            variant="ghost"
            size="icon"
            title={action.title}
            aria-label={action.ariaLabel}
            onClick={() => {
              if (window) action.onClick(window);
            }}
            disableScale
          >
            {action.icon}
          </Button>
        );
      })}
    </div>
  );
}

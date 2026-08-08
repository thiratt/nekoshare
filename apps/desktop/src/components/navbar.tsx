import {
  LuMaximize,
  LuMinus,
  LuPanelLeftClose,
  LuPanelLeftOpen,
  LuX,
} from "react-icons/lu";
import { TiTabsOutline } from "react-icons/ti";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { useNSDesktop } from "@/context/NSDesktopContext";

interface DesktopTitlebarHelperActionsProps {
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
  actived?: boolean;
  badge?: boolean;
}

interface DesktopTitlebarProps {
  helperActions?: DesktopTitlebarHelperActionsProps[];
  sidebarToggle?: {
    isOpen: boolean;
    onToggle: () => void;
    disabled?: boolean;
  };
}

function DesktopTitlebar({
  helperActions,
  sidebarToggle,
}: DesktopTitlebarProps) {
  const { isMaximized, isSnapHover, minimize, close } = useNSDesktop();

  return (
    <div className="flex items-center w-full h-11 bg-background border-b">
      <div className="flex-1 h-full flex items-center min-w-0">
        {sidebarToggle && (
          <Button
            className="ms-2 size-6 hover:bg-muted/20 dark:hover:bg-[#373737]"
            variant="ghost"
            size="icon-sm"
            title={sidebarToggle.isOpen ? "Collapse sidebar" : "Expand sidebar"}
            onClick={sidebarToggle.onToggle}
            disabled={sidebarToggle.disabled}
            tabIndex={-1}
          >
            {sidebarToggle.isOpen ? <LuPanelLeftClose /> : <LuPanelLeftOpen />}
          </Button>
        )}
        <div
          data-neko-titlebar
          className="flex h-full min-w-0 flex-1 items-center"
        >
          <h1 className="pointer-events-none select-none pl-2 font-semibold text-sm lg:text-base">
            Neko Share Desktop
          </h1>
        </div>
      </div>
      <div className="flex items-center h-full">
        {helperActions && (
          <div className="space-x-1 mr-1">
            {helperActions.map((action, index) => (
              <Tooltip key={index} delayDuration={350}>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      "relative hover:bg-primary/15",
                      action.actived && "bg-primary/15 ",
                    )}
                    variant="ghost"
                    onClick={action.onClick}
                    tabIndex={-1}
                  >
                    {action.icon}
                    {action.badge && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">{action.title}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
        <Button
          className="h-full w-12 rounded-none hover:bg-muted dark:hover:bg-[#373737]"
          variant="ghost"
          size="icon"
          title="Minimize"
          onClick={minimize}
          tabIndex={-1}
          data-desktop-window-control="minimize"
        >
          <LuMinus />
        </Button>

        <Button
          className={cn(
            "h-full w-12 rounded-none focus:ring-0 focus-visible:ring-0 dark:hover:bg-[#373737] select-none",
            isSnapHover && "bg-accent text-accent-foreground dark:bg-[#373737]",
          )}
          variant="ghost"
          size="icon"
          title={isMaximized ? "Restore" : "Maximize"}
          tabIndex={-1}
          data-desktop-window-control="maximize"
        >
          {isMaximized ? <TiTabsOutline /> : <LuMaximize />}
        </Button>

        <Button
          className={`h-full w-12 rounded-none transition-colors hover:bg-[#C42B1C]! hover:text-white! active:bg-[#C42B1CE6]!`}
          variant="ghost"
          size="icon"
          title="Close"
          onClick={close}
          tabIndex={-1}
          data-desktop-window-control="close"
        >
          <LuX />
        </Button>
      </div>
    </div>
  );
}

export { DesktopTitlebar };

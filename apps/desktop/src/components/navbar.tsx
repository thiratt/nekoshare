import { useTitlebarControl } from "@/hooks/useTitlebarControl";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { LuMaximize, LuMinus, LuX } from "react-icons/lu";
import { TiTabsOutline } from "react-icons/ti";

interface DesktopTitlebarHelperActionsProps {
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
  actived?: boolean;
  badge?: boolean;
}

interface DesktopTitlebarProps {
  helperActions?: DesktopTitlebarHelperActionsProps[];
}

function DesktopTitlebar({ helperActions }: DesktopTitlebarProps) {
  const { isMaximized, minimize, toggleMaximize, close } = useTitlebarControl();

  return (
    <div className="flex items-center w-full h-10 bg-primary">
      <div data-tauri-drag-region className="flex-1 h-full flex items-center">
        <h1 className="pointer-events-none select-none pl-3 font-semibold text-background text-sm lg:text-base">
          Nekoshare Desktop
        </h1>
      </div>
      <div className="flex items-center h-full text-background">
        {helperActions && (
          <div className="space-x-1 mr-1">
            {helperActions.map((action, index) => (
              <Button
                key={index}
                className={cn(
                  "relative hover:bg-muted/20 hover:text-background dark:hover:bg-muted/20 size-6",
                  action.actived && "bg-muted/20",
                )}
                variant="ghost"
                title={action.title}
                onClick={action.onClick}
                tabIndex={-1}
              >
                {action.icon}
                {action.badge && (
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            ))}
          </div>
        )}
        <Button
          className="h-full w-12 rounded-none hover:bg-muted/20 hover:text-background dark:hover:bg-muted/20"
          variant="ghost"
          size="icon"
          title="Minimize"
          onClick={minimize}
          tabIndex={-1}
        >
          <LuMinus />
        </Button>

        <Button
          className="h-full w-12 rounded-none right-0 focus:ring-0 focus-visible:ring-0 hover:bg-muted/20 hover:text-background"
          variant="ghost"
          size="icon"
          title={isMaximized ? "Restore" : "Maximize"}
          onClick={toggleMaximize}
          tabIndex={-1}
        >
          {isMaximized ? <TiTabsOutline /> : <LuMaximize />}
        </Button>

        <Button
          className="h-full w-12 rounded-none hover:bg-destructive hover:text-destructive-foreground dark:hover:bg-destructive dark:hover:text-white transition-colors"
          variant="ghost"
          size="icon"
          title="Close"
          onClick={close}
          tabIndex={-1}
        >
          <LuX />
        </Button>
      </div>
    </div>
  );
}

export { DesktopTitlebar };

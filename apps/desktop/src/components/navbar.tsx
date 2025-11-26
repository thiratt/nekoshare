import { useTitlebarControl } from "@/hooks/useTitlebarControl";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { LuMaximize, LuMinus, LuX } from "react-icons/lu";
import { TiTabsOutline } from "react-icons/ti";

interface NavigationBarProps {
  onlyControl?: boolean;
}

function DesktopTitlebar({ onlyControl = false }: NavigationBarProps) {
  const { isMaximized, minimize, toggleMaximize, close } = useTitlebarControl();

  return (
    <div
      className={cn(
        "flex items-center w-full h-10 bg-primary dark:bg-primary/20",
        !onlyControl && "border-b",
      )}
    >
      <div data-tauri-drag-region className="flex-1 h-full flex items-center">
        {!onlyControl && (
          <h1 className="pointer-events-none select-none pl-3 font-semibold text-background text-sm lg:text-base">
            Nekoshare Desktop
          </h1>
        )}
      </div>
      <div className="flex items-center h-full text-background">
        <Button
          className="h-full w-12 rounded-none hover:bg-muted/20 hover:text-background"
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

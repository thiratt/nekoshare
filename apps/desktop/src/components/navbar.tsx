import { useTitlebarControl } from "@/hooks/useTitlebarControl";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { LuMaximize, LuMinimize, LuMinus, LuX } from "react-icons/lu";

interface NavigationBarProps {
  onlyControl?: boolean;
}

function DesktopTitlebar({ onlyControl = false }: NavigationBarProps) {
  const { isMaximized, minimize, toggleMaximize, close } = useTitlebarControl();

  return (
    <div
      className={cn(
        "flex items-center w-full h-10",
        !onlyControl && "border-b",
      )}
    >
      <div data-tauri-drag-region className="flex-1 h-full flex items-center">
        {!onlyControl && (
          <h1 className="pointer-events-none select-none pl-3 font-semibold text-primary text-sm lg:text-base">
            Nekoshare Desktop
          </h1>
        )}
      </div>
      <div className="flex items-center h-full">
        <Button
          className="h-full w-12 rounded-none"
          variant="ghost"
          size="icon"
          title="Minimize"
          onClick={minimize}
          tabIndex={-1}
        >
          <LuMinus />
        </Button>

        <Button
          className="h-full w-12 rounded-none right-0 focus:ring-0 focus-visible:ring-0"
          variant="ghost"
          size="icon"
          title={isMaximized ? "Restore" : "Maximize"}
          onClick={toggleMaximize}
          tabIndex={-1}
        >
          {isMaximized ? <LuMinimize /> : <LuMaximize />}
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

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

interface WebTitlebarHelperActionsProps {
  icon: React.ReactNode;
  onClick: () => void;
  title?: string;
  actived?: boolean;
  badge?: boolean;
}

interface WebTitlebarProps {
  helperActions?: WebTitlebarHelperActionsProps[];
}

function WebTitlebar({ helperActions }: WebTitlebarProps) {
  return (
    <div className="flex items-center w-full h-11 bg-primary dark:bg-background border-b-2">
      <div data-tauri-drag-region className="flex-1 h-full flex items-center">
        <h1 className="pointer-events-none select-none pl-3 font-semibold text-background dark:text-foreground text-sm lg:text-base">
          Nekoshare Desktop
        </h1>
      </div>
      <div className="flex items-center h-full text-background dark:text-foreground">
        {helperActions && (
          <div className="space-x-1 mr-1">
            {helperActions.map((action, index) => (
              <Button
                key={index}
                className={cn(
                  "relative hover:bg-muted/20 hover:text-background dark:hover:bg-[#373737] dark:hover:text-foreground",
                  action.actived && "bg-muted/20 dark:bg-[#373737]",
                )}
                variant="ghost"
                title={action.title}
                onClick={action.onClick}
                tabIndex={-1}
              >
                {action.icon}
                {action.badge && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { WebTitlebar };

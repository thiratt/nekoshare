import {
  Home as HomeIcon,
  ChevronLeft,
  User,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { useSidebar } from "@/hooks/useSidebar";

const sidebarLink = [
  {
    label: "หน้าหลัก",
    link: "/home",
    icon: HomeIcon,
  },
  {
    label: "สมาชิก",
    link: "/home/members",
    icon: User,
  },
];

export function HomeSidebar() {
  const { isOpen, toggleSidebar } = useSidebar();
  const location = useLocation();

  return (
    <TooltipProvider>
      <div
        className={cn(
          "group relative flex flex-col py-4 border-r transition-all duration-300",
          isOpen ? "w-52 xl:w-64 px-3" : "w-16 px-2",
        )}
      >
        <nav className="space-y-1">
          <div
            className={cn(
              "flex transition-all gap-2 items-center mb-4",
              !isOpen && "ms-2",
            )}
          >
            <Button
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 rounded-full"
            >
              <ChevronLeft
                className={cn(
                  "transition-transform",
                  isOpen ? "rotate-180" : "rotate-0",
                )}
              />
            </Button>

            {isOpen && (
              <h1 className="text-xl font-bold truncate">Admin Panel</h1>
            )}
          </div>
          {sidebarLink.map((item) => {
            const isActive = location.pathname === item.link;
            const translatedLabel = item.label;

            const buttonContent = (
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full h-10 justify-start"
                asChild
              >
                <Link to={item.link}>
                  <div className="flex items-center gap-3">
                    <item.icon size={20} />
                    {isOpen && (
                      <span className="animate-in slide-in-from-left-20 fade-in">
                        {translatedLabel}
                      </span>
                    )}
                  </div>
                </Link>
              </Button>
            );

            if (!isOpen) {
              return (
                <Tooltip key={item.link}>
                  <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {translatedLabel}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.link}>{buttonContent}</div>;
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
}

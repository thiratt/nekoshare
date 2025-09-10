import {
  Bell,
  BellOff,
  Settings,
  Trash,
  LogIn,
  CheckCircle,
  ArrowDownCircle,
  X,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Progress } from "@workspace/ui/components/progress";

import { APP_NAME } from "@/config";

import { NavigationBarWindowControl } from "./window-control";
import { useNekoShare } from "@/context/nekoshare";

import { ScrollArea } from "@workspace/ui/components/scroll-area";
import type { JSX } from "react";

interface NavigationBarProps {
  onlyControl?: boolean;
}

interface NotificationItemProps {
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
}

function NotificationEmptyContent() {
  return (
    <div className="p-6 text-center">
      <BellOff className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-muted-foreground">No notifications yet</p>
      <p className="text-xs text-muted-foreground mt-1">
        You're all caught up!
      </p>
    </div>
  );
}

function NotificationItem({
  title,
  description,
  time,
  icon,
}: NotificationItemProps) {
  return (
    <div className="cursor-pointer p-4 transition-colors border-b hover:bg-muted">
      <div className="flex items-start">
        <div
          className={`flex items-center justify-center rounded-full w-9 h-9`}
        >
          {icon}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{time}</p>
        </div>
        <Button variant="ghost" size="icon" className="ml-auto">
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function UploadingNotification() {
  const progress = 12; // Example progress; replace with actual state
  return (
    <div className="p-4 border-b">
      <div className="flex items-center">
        <div className="flex items-center justify-center rounded-full w-9 h-9">
          <Spinner />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Uploading file
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            example-file.zip to destination device
          </p>
          <Progress value={progress} />
        </div>
        <Button variant="ghost" size="icon">
          <X />
        </Button>
      </div>
    </div>
  );
}

export function NavigationBarBasic(
  props: React.ComponentProps<"div">,
): JSX.Element {
  return <div {...props}></div>;
}

export function NavigationBar({ onlyControl = false }: NavigationBarProps) {
  const { setMode } = useNekoShare();

  // Example notifications; in real app, fetch from state/context
  const notifications = [
    {
      title: "New Device Login",
      description: "A new device has logged in from IP 192.168.1.1",
      time: "5 min ago",
      icon: <LogIn className="text-red-500" />,
    },
    {
      title: "File Sent",
      description: "Document.pdf has been sent to Device X",
      time: "10 min ago",
      icon: <CheckCircle className="text-green-500" />,
    },
    {
      title: "Incoming File Request",
      description: "Device Y wants to send Photo.jpg to this device",
      time: "15 min ago",
      icon: <ArrowDownCircle className="text-blue-500" />,
    },
  ];

  // Example uploading state; replace with actual logic
  const isUploading = true;

  if (onlyControl) {
    return (
      <div
        data-tauri-drag-region
        className="bg-muted/30 sticky top-0 flex items-center border-b justify-between z-10 overflow-hidden"
      >
        <div className="pointer-events-none flex h-9 justify-center items-center p-4 rounded-br-lg font-semibold">
          {APP_NAME}
        </div>
        <div className="flex rounded-bl-lg">
          <NavigationBarWindowControl />
        </div>
      </div>
    );
  }

  return (
    <div data-tauri-drag-region className="flex items-center border-b">
      <h1
        className="pointer-events-none pl-2 font-semibold text-primary text-xl"
        aria-label={`${APP_NAME} logo`}
      >
        {APP_NAME}
      </h1>

      {/* Window Controls on the right */}
      <div className="flex ms-auto gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Notifications"
              disableScale
            >
              <Bell />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-md divide-y p-0 shadow-lg rounded-lg"
            align="end"
          >
            <header className="p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Notifications ({notifications.length})
              </h3>
              <Button variant="ghost" size="icon">
                <Settings />
              </Button>
            </header>
            {isUploading && <UploadingNotification />}
            <ScrollArea className="h-80">
              {notifications.length === 0 ? (
                <NotificationEmptyContent />
              ) : (
                notifications.map((notif, index) => (
                  <NotificationItem key={index} {...notif} />
                ))
              )}
            </ScrollArea>
            <footer>
              <Button className="w-full h-16" variant="ghost" disableScale>
                View all notifications
              </Button>
            </footer>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMode("setting")}
          title="Settings"
          disableScale
        >
          <Settings />
        </Button>
        <NavigationBarWindowControl />
      </div>
    </div>
  );
}

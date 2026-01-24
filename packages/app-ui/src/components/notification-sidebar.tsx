import { useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuBell, LuCheckCheck, LuHardDrive, LuShieldAlert, LuSmartphone, LuTrash, LuX } from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useSidebar } from "@workspace/app-ui/hooks/use-sidebar";

type NotificationType = "security" | "system" | "update" | "info";

interface Notification {
	id: string;
	title: string;
	description: string;
	timestamp: string;
	type: NotificationType;
	read: boolean;
	action?: {
		label: string;
		path: string;
	};
}

const MOCK_NOTIFICATIONS: Notification[] = [
	{
		id: "1",
		title: "New Device Login",
		description: "A new device (iPhone 15) signed in from Tokyo, Japan.",
		timestamp: "2 minutes ago",
		type: "security",
		read: false,
		action: {
			label: "Review Activity",
			path: "/device",
		},
	},
];

export function NotificationSidebar() {
	const { notificationStatus, setNotificationStatus } = useNekoShare();
	const { toggleSidebar } = useSidebar();
	const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

	const handleClose = () => {
		setNotificationStatus("off");
		toggleSidebar();
	};

	const handleNavigate = (path: string) => {
		console.log(`Navigating to: ${path}`);
	};

	const markAsRead = (id: string) => {
		setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
	};

	const markAllRead = () => {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
	};

	const deleteNotification = (id: string) => {
		setNotifications((prev) => prev.filter((n) => n.id !== id));
	};

	const clearAll = () => setNotifications([]);

	const unreadCount = notifications.filter((n) => !n.read).length;

	const getIcon = (type: NotificationType) => {
		switch (type) {
			case "security":
				return <LuShieldAlert className="h-4 w-4 text-destructive" />;
			case "system":
				return <LuHardDrive className="h-4 w-4 text-blue-500" />;
			case "update":
				return <LuSmartphone className="h-4 w-4 text-green-500" />;
			default:
				return <LuBell className="h-4 w-4 text-muted-foreground" />;
		}
	};

	return (
		<AnimatePresence mode="wait">
			{notificationStatus === "on" && (
				<motion.div
					key="sidebar"
					initial={{ width: 0, opacity: 0 }}
					animate={{ width: "24rem", opacity: 1 }}
					exit={{ width: 0, opacity: 0 }}
					className="overflow-hidden border-r bg-background h-full shadow-xl z-20"
				>
					<div className="w-[24rem] h-full flex flex-col">
						<div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
							<div className="flex items-center gap-2">
								<h3 className="font-semibold text-sm">Notifications</h3>
								{unreadCount > 0 && (
									<Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
										{unreadCount}
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onClick={markAllRead}
									title="Mark all as read"
									className="h-8 w-8 text-muted-foreground hover:text-foreground"
								>
									<LuCheckCheck className="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={clearAll}
									title="Clear all"
									className="h-8 w-8 text-muted-foreground hover:text-foreground"
								>
									<LuTrash className="text-destructive" />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={handleClose}
									className="h-8 w-8 text-muted-foreground hover:text-foreground"
								>
									<LuX className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<ScrollArea className="flex-1">
							<div className="flex flex-col min-h-full pb-4 relative">
								<AnimatePresence mode="popLayout" initial={false}>
									{notifications.length === 0 && (
										<motion.div
											key="empty-state"
											initial={{ opacity: 0, scale: 0.9 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
											className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-2 mt-20 absolute inset-x-0 top-0"
										>
											<LuBell className="h-10 w-10 opacity-20" />
											<p className="text-sm truncate">No notifications</p>
										</motion.div>
									)}

									{notifications.map((notification) => (
										<motion.div
											key={notification.id}
											layout
											initial={{ opacity: 0, scale: 0.95, y: -20 }}
											animate={{ opacity: 1, scale: 1, y: 0 }}
											exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
											transition={{
												duration: 0.3,
												type: "spring",
												bounce: 0,
												opacity: { duration: 0.2 },
											}}
											className={cn(
												"flex gap-4 p-4 border-b hover:bg-muted/40 transition-colors relative group items-start cursor-pointer bg-background",
												notification.read && "bg-muted/40"
											)}
											onClick={() => markAsRead(notification.id)}
										>
											<div
												className={cn(
													"p-2 rounded-full bg-background border shadow-sm shrink-0"
												)}
											>
												{getIcon(notification.type)}
											</div>

											<div className="flex-1 space-y-1">
												<div className="flex justify-between items-start gap-2">
													<p
														className={cn(
															"flex text-sm font-medium leading-none items-center gap-1.5",
															!notification.read && "font-semibold"
														)}
													>
														{notification.title}
														{!notification.read && (
															<span className="h-2 w-2 rounded-full bg-primary"></span>
														)}
													</p>
												</div>
												<p className="text-sm text-muted-foreground line-clamp-2">
													{notification.description}
												</p>
												<div className="flex items-center gap-2 pt-1">
													<span className="text-xs text-muted-foreground">
														{notification.timestamp}
													</span>
												</div>

												{notification.action && (
													<Button
														size="sm"
														variant="outline"
														className="mt-2 h-7 text-xs"
														onClick={(e) => {
															e.stopPropagation();
															markAsRead(notification.id);
															handleNavigate(notification.action!.path);
														}}
													>
														{notification.action.label}
													</Button>
												)}
											</div>

											<Button
												className="opacity-0 group-hover:opacity-100 transition-opacity"
												variant="ghost"
												size="icon"
												onClick={(e) => {
													e.stopPropagation();
													deleteNotification(notification.id);
												}}
												title="Delete Notification"
											>
												<LuTrash className="h-4 w-4 text-destructive" />
											</Button>
										</motion.div>
									))}
								</AnimatePresence>
							</div>
						</ScrollArea>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

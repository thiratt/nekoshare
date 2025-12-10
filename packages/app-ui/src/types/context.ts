export type Mode = "home" | "settings";
export type NotificationStatus = "on" | "off";

export interface Router {
	navigate: (opts: any) => any;
}

export interface NekoShareContextType {
	isGlobalLoading: boolean;
	mode: Mode;
	notificationStatus: NotificationStatus;
	router: Router;
	setGlobalLoading: (loading: boolean) => void;
	setMode: (mode: Mode) => void;
	setNotificationStatus: (status: NotificationStatus) => void;
	toggleNotification: () => void;
}

export type Mode = "home" | "settings";
export type NotificationStatus = "on" | "off";

export interface Router {
	navigate: (opts: any) => any;
}

export interface NekoShareContextType {
	isGlobalLoading: boolean;
	mode: Mode;
	notification: NotificationStatus;
	router: Router;
	setGlobalLoading: (loading: boolean) => void;
	setMode: (mode: Mode) => void;
	setNotification: (status: NotificationStatus) => void;
	toggleNotification: () => void;
}

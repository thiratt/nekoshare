import { LocalDeviceInfo } from "./device";

export type Mode = "home" | "settings";
export type NotificationStatus = "on" | "off";

export interface NavigateOptions {
	[key: string]: string | number | boolean | object | undefined;
}

export interface Router {
	navigate: (opts: NavigateOptions) => void;
	options: {
		context?: {
			currentDeviceId?: string;
		};
	};
}

export interface NekoShareContextType {
	globalLoading: boolean;
	mode: Mode;
	notificationStatus: NotificationStatus;
	router: Router;
	currentDevice: LocalDeviceInfo | undefined;
	setGlobalLoading: (loading: boolean) => void;
	setMode: (mode: Mode) => void;
	setNotificationStatus: (status: NotificationStatus) => void;
	toggleNotification: () => void;
}

import type { LocalDeviceInfo } from "./device";

export const ApplicationMode = {
	HOME: "home",
	SETTINGS: "settings",
} as const;

export type Mode = (typeof ApplicationMode)[keyof typeof ApplicationMode];

export const NotificationStatusValues = {
	ON: "on",
	OFF: "off",
} as const;

export type NotificationStatus = (typeof NotificationStatusValues)[keyof typeof NotificationStatusValues];

export interface NavigateOptions {
	to: string;
	params?: Record<string, string | number>;
	search?: Record<string, string | number | boolean>;
	replace?: boolean;
}

export interface RouterContext {
	currentDeviceId?: string;
}

export interface Router {
	navigate: (opts: NavigateOptions) => void;
	options: {
		context?: RouterContext;
	};
}

export interface GlobalLoadingState {
	readonly loading: boolean;
	readonly setLoading: (loading: boolean) => void;
}

export interface NekoShareContextType {
	readonly globalLoading: boolean;
	readonly mode: Mode;
	readonly notificationStatus: NotificationStatus;
	readonly router: Router;
	readonly currentDevice: LocalDeviceInfo | undefined;
	readonly setGlobalLoading: (loading: boolean) => void;
	readonly setMode: (mode: Mode) => void;
	readonly setNotificationStatus: (status: NotificationStatus) => void;
	readonly toggleNotification: () => void;
}

export interface NekoShareProviderProps<TRouter extends Router = Router> {
	router: TRouter;
	children: React.ReactNode;
	globalLoading: GlobalLoadingState;
	currentDevice: LocalDeviceInfo | undefined;
}

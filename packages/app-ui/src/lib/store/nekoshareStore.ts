import { create } from "zustand";

import type { Mode, NotificationStatus } from "@workspace/app-ui/types/context";

const LOADING_HIDE_DELAY_MS = 500;

interface NekoShareState {
	mode: Mode;
	notificationStatus: NotificationStatus;
	globalLoading: boolean;
}

interface NekoShareActions {
	setMode: (mode: Mode) => void;
	setNotificationStatus: (status: NotificationStatus) => void;
	toggleNotification: () => void;
	setGlobalLoading: (loading: boolean) => void;
}

export type NekoShareStore = NekoShareState & NekoShareActions;

let loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;

const clearLoadingTimeout = (): void => {
	if (loadingTimeoutId !== null) {
		clearTimeout(loadingTimeoutId);
		loadingTimeoutId = null;
	}
};

export const useNekoShareStore = create<NekoShareStore>((set) => ({
	mode: "home",
	notificationStatus: "off",
	globalLoading: false,
	setMode: (mode) => set({ mode }),
	setNotificationStatus: (status) => set({ notificationStatus: status }),
	toggleNotification: () =>
		set((state) => ({
			notificationStatus: state.notificationStatus === "on" ? "off" : "on",
		})),
	setGlobalLoading: (loading) => {
		clearLoadingTimeout();

		if (loading) {
			set({ globalLoading: true });
		} else {
			loadingTimeoutId = setTimeout(() => {
				set({ globalLoading: false });
				loadingTimeoutId = null;
			}, LOADING_HIDE_DELAY_MS);
		}
	},
}));

export const useMode = (): Mode => useNekoShareStore((state) => state.mode);

export const useNotificationStatus = (): NotificationStatus => useNekoShareStore((state) => state.notificationStatus);

export const useGlobalLoading = (): boolean => useNekoShareStore((state) => state.globalLoading);

export const useSetMode = (): ((mode: Mode) => void) => useNekoShareStore((state) => state.setMode);

export const useSetNotificationStatus = (): ((status: NotificationStatus) => void) =>
	useNekoShareStore((state) => state.setNotificationStatus);

export const useToggleNotification = (): (() => void) => useNekoShareStore((state) => state.toggleNotification);

export const useSetGlobalLoading = (): ((loading: boolean) => void) =>
	useNekoShareStore((state) => state.setGlobalLoading);

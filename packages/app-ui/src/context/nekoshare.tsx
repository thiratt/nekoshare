import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";

import { Toaster } from "@workspace/ui/components/sonner";

import LoadingOverlay from "@workspace/app-ui/components/global-loading";
import { SessionTerminatedDialog } from "@workspace/app-ui/components/session-terminated-dialog";
import { SettingsUI } from "@workspace/app-ui/components/ui/settings/index";
import { usePacketRouter } from "@workspace/app-ui/hooks/usePacketRouter";
import { PacketType, socketClient } from "@workspace/app-ui/lib/nk-socket/index";
import type {
	GlobalLoadingState,
	Mode,
	NekoShareContextType,
	NotificationStatus,
	Router,
} from "@workspace/app-ui/types/context";
import type { LocalDeviceInfo } from "@workspace/app-ui/types/device";

import { authClient, invalidateSessionCache } from "../lib/auth";

const NekoShareContext = createContext<NekoShareContextType | null>(null);

const SPRING_TRANSITION: Transition = {
	type: "spring",
	stiffness: 300,
	damping: 30,
	mass: 0.8,
};

const BACKDROP_VARIANTS: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1 },
};

const OVERLAY_VARIANTS: Variants = {
	hidden: {
		opacity: 0,
		y: 24,
		scale: 0.98,
	},
	visible: {
		opacity: 1,
		y: 0,
		scale: 1,
	},
	exit: {
		opacity: 0,
		y: 24,
		scale: 0.98,
	},
};

const CONTENT_SCALE_ACTIVE = { scale: 1, y: 0 };
const CONTENT_SCALE_INACTIVE = { scale: 0.97, y: -10 };
const LOADING_HIDE_DELAY_MS = 500;

interface SessionTerminatedState {
	readonly open: boolean;
	readonly terminator: string;
}

const INITIAL_SESSION_STATE: SessionTerminatedState = {
	open: false,
	terminator: "",
};

interface NekoShareProviderProps<TRouter extends Router = Router> {
	router: TRouter;
	children: ReactNode;
	globalLoading: GlobalLoadingState;
	currentDevice: LocalDeviceInfo | undefined;
}

const NekoShareProvider = <TRouter extends Router>({
	router,
	children,
	globalLoading,
	currentDevice,
}: NekoShareProviderProps<TRouter>): React.ReactElement => {
	const [mode, setMode] = useState<Mode>("home");
	const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>("off");
	const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [sessionTerminated, setSessionTerminated] = useState<SessionTerminatedState>(INITIAL_SESSION_STATE);

	usePacketRouter({
		[PacketType.DEVICE_REMOVED]: (result) => {
			if (result.status !== "success") {
				console.error("[NekoShareProvider] Failed to parse DEVICE_REMOVED packet:", result.error.message);
				return;
			}

			const { id, deviceIdentifier, terminatedBy } = result.data;

			const isCurrentDeviceRemoved =
				currentDevice && (id === currentDevice.id || deviceIdentifier === currentDevice.id);

			if (isCurrentDeviceRemoved) {
				console.log("[NekoShareProvider] Current device was removed, showing termination dialog");
				setSessionTerminated({
					open: true,
					terminator: terminatedBy,
				});
			}
		},
	});

	const toggleNotification = useCallback((): void => {
		setNotificationStatus((previousStatus) => (previousStatus === "on" ? "off" : "on"));
	}, []);

	const handleSetGlobalLoading = useCallback(
		(isLoading: boolean): void => {
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
				loadingTimeoutRef.current = null;
			}

			if (isLoading) {
				globalLoading.setLoading(true);
			} else {
				loadingTimeoutRef.current = setTimeout(() => {
					globalLoading.setLoading(false);
					loadingTimeoutRef.current = null;
				}, LOADING_HIDE_DELAY_MS);
			}
		},
		[globalLoading],
	);

	const handleSetMode = useCallback((newMode: Mode): void => {
		setMode(newMode);
	}, []);

	const handleSetNotification = useCallback((status: NotificationStatus): void => {
		setNotificationStatus(status);
	}, []);

	const handleSessionTerminationComplete = useCallback(async (): Promise<void> => {
		try {
			socketClient.disconnect();

			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						invalidateSessionCache();
						setSessionTerminated(INITIAL_SESSION_STATE);
						router.navigate({ to: "/login" });
					},
				},
			});
		} catch (error) {
			console.error(
				"[NekoShareProvider] Error during session termination:",
				error instanceof Error ? error.message : error,
			);

			invalidateSessionCache();
			setSessionTerminated(INITIAL_SESSION_STATE);
			router.navigate({ to: "/login" });
		}
	}, [router]);

	const contextValue = useMemo<NekoShareContextType>(
		() => ({
			globalLoading: globalLoading.loading,
			mode,
			notificationStatus,
			router,
			currentDevice,
			setGlobalLoading: handleSetGlobalLoading,
			setMode: handleSetMode,
			setNotificationStatus: handleSetNotification,
			toggleNotification,
		}),
		[
			globalLoading.loading,
			mode,
			notificationStatus,
			router,
			currentDevice,
			handleSetGlobalLoading,
			handleSetMode,
			handleSetNotification,
			toggleNotification,
		],
	);

	const isHomeMode = mode === "home";
	const contentAnimationState = isHomeMode ? CONTENT_SCALE_ACTIVE : CONTENT_SCALE_INACTIVE;

	return (
		<NekoShareContext.Provider value={contextValue}>
			<div className="relative h-screen overflow-hidden">
				<motion.div
					className="h-full will-change-transform"
					initial={false}
					animate={contentAnimationState}
					transition={SPRING_TRANSITION}
				>
					{children}
				</motion.div>
				<AnimatePresence mode="wait">
					{!isHomeMode && (
						<motion.div
							key="settings-overlay"
							className="absolute inset-0 z-10"
							variants={BACKDROP_VARIANTS}
							initial="hidden"
							animate="visible"
							exit="hidden"
							transition={{ duration: 0.2 }}
						>
							<div className="absolute inset-0 bg-background/80 backdrop-blur-xs" />
							<motion.div
								className="relative h-full"
								variants={OVERLAY_VARIANTS}
								initial="hidden"
								animate="visible"
								exit="exit"
								transition={SPRING_TRANSITION}
							>
								<SettingsUI />
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
			<AnimatePresence>
				{globalLoading.loading && <LoadingOverlay key="global-loading-overlay" />}
			</AnimatePresence>
			<SessionTerminatedDialog
				open={sessionTerminated.open}
				terminatorName={sessionTerminated.terminator}
				onComplete={handleSessionTerminationComplete}
			/>
			<Toaster richColors position="top-right" offset={{ top: "3rem" }} />
		</NekoShareContext.Provider>
	);
};

const useNekoShare = (): NekoShareContextType => {
	const context = useContext(NekoShareContext);
	if (context === null) {
		throw new Error("useNekoShare must be used within a NekoShareProvider");
	}
	return context;
};

export { NekoShareProvider, useNekoShare };

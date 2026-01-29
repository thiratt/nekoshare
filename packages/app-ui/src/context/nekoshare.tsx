import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";

import { Toaster } from "@workspace/ui/components/sonner";

import LoadingOverlay from "@workspace/app-ui/components/global-loading";
import { SessionTerminatedDialog } from "@workspace/app-ui/components/session-terminated-dialog";
import { SettingsUI } from "@workspace/app-ui/components/ui/settings/index";
import { usePacketRouter } from "@workspace/app-ui/hooks/usePacketRouter";
import { PacketType, socketClient } from "@workspace/app-ui/lib/nk-socket/index";
import { useGlobalLoading, useMode, useNekoShareStore, useSetMode } from "@workspace/app-ui/lib/store/nekoshareStore";
import type { Router, UseNekoShareReturn } from "@workspace/app-ui/types/context";
import type { LocalDeviceInfo } from "@workspace/app-ui/types/device";

import { authClient, invalidateSessionCache } from "../lib/auth";

interface NekoShareContextValue {
	readonly router: Router;
	readonly currentDevice: LocalDeviceInfo | undefined;
}

const NekoShareContext = createContext<NekoShareContextValue | null>(null);

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
	currentDevice: LocalDeviceInfo | undefined;
}

const NekoShareProvider = <TRouter extends Router>({
	router,
	children,
	currentDevice,
}: NekoShareProviderProps<TRouter>): React.ReactElement => {
	const [sessionTerminated, setSessionTerminated] = useState<SessionTerminatedState>(INITIAL_SESSION_STATE);

	const mode = useMode();
	const setMode = useSetMode();

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
				setMode("home");
				setSessionTerminated({
					open: true,
					terminator: terminatedBy,
				});
			}
		},
	});

	const handleSessionTerminationComplete = useCallback(async (): Promise<void> => {
		try {
			socketClient.setAutoReconnect(false);
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

	const contextValue = useMemo<NekoShareContextValue>(
		() => ({
			router,
			currentDevice,
		}),
		[router, currentDevice],
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
			<GlobalLoadingOverlay />
			<SessionTerminatedDialog
				open={sessionTerminated.open}
				terminatorName={sessionTerminated.terminator}
				onComplete={handleSessionTerminationComplete}
			/>
			<Toaster richColors position="top-right" offset={{ top: "3rem" }} />
		</NekoShareContext.Provider>
	);
};

const GlobalLoadingOverlay = (): React.ReactElement | null => {
	const globalLoading = useGlobalLoading();

	return <AnimatePresence>{globalLoading && <LoadingOverlay key="global-loading-overlay" />}</AnimatePresence>;
};

const useNekoShare = (): UseNekoShareReturn => {
	const context = useContext(NekoShareContext);
	if (context === null) {
		throw new Error("useNekoShare must be used within a NekoShareProvider");
	}

	const mode = useNekoShareStore((state) => state.mode);
	const notificationStatus = useNekoShareStore((state) => state.notificationStatus);
	const globalLoading = useNekoShareStore((state) => state.globalLoading);
	const setMode = useNekoShareStore((state) => state.setMode);
	const setNotificationStatus = useNekoShareStore((state) => state.setNotificationStatus);
	const toggleNotification = useNekoShareStore((state) => state.toggleNotification);
	const setGlobalLoading = useNekoShareStore((state) => state.setGlobalLoading);

	return {
		router: context.router,
		currentDevice: context.currentDevice,
		mode,
		notificationStatus,
		globalLoading,
		setMode,
		setNotificationStatus,
		toggleNotification,
		setGlobalLoading,
	};
};

export { NekoShareProvider, useNekoShare };

export {
	useGlobalLoading,
	useMode,
	useNekoShareStore,
	useNotificationStatus,
	useSetGlobalLoading,
	useSetMode,
	useSetNotificationStatus,
	useToggleNotification,
} from "@workspace/app-ui/lib/store/nekoshareStore";

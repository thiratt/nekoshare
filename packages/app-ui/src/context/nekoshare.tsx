import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";

import { Toaster } from "@workspace/ui/components/sonner";

import LoadingOverlay from "@workspace/app-ui/components/global-loading";
import { SettingsUI } from "@workspace/app-ui/components/ui/settings/index";
import type { Mode, NekoShareContextType, NotificationStatus, Router } from "@workspace/app-ui/types/context";
import type { LocalDeviceInfo } from "@workspace/app-ui/types/device";

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

interface NekoShareProviderProps<TRouter extends Router = Router> {
	router: TRouter;
	children: ReactNode;
	globalLoading: { loading: boolean; setLoading: (loading: boolean) => void };
	currentDevice: LocalDeviceInfo | undefined;
}

const NekoShareProvider = <TRouter extends Router>({
	router,
	children,
	globalLoading,
	currentDevice,
}: NekoShareProviderProps<TRouter>) => {
	const [mode, setMode] = useState<Mode>("home");
	const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>("off");
	const loadingTimeoutRef = useRef<number | null>(null);

	const toggleNotification = useCallback(() => {
		setNotificationStatus((previousStatus) => (previousStatus === "on" ? "off" : "on"));
	}, []);

	const handleSetGlobalLoading = useCallback(
		(isLoading: boolean) => {
			if (loadingTimeoutRef.current) {
				clearTimeout(loadingTimeoutRef.current);
				loadingTimeoutRef.current = null;
			}
			if (isLoading) {
				requestAnimationFrame(() => {
				});
			} else {
				loadingTimeoutRef.current = setTimeout(() => {
					globalLoading.setLoading(isLoading);
					loadingTimeoutRef.current = null;
				}, 500);
			}
		},
		[globalLoading]
	);

	const handleSetMode = useCallback((newMode: Mode) => {
		setMode(newMode);
	}, []);

	const handleSetNotification = useCallback((status: NotificationStatus) => {
		setNotificationStatus(status);
	}, []);

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
			globalLoading,
			mode,
			notificationStatus,
			router,
			currentDevice,
			handleSetGlobalLoading,
			handleSetMode,
			handleSetNotification,
			toggleNotification,
		]
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

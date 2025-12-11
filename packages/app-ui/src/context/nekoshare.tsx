import { createContext, useContext, useState, useMemo, useCallback, useRef, type ReactNode, useEffect } from "react";

import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";

import { Toaster } from "@workspace/ui/components/sonner";
import LoadingOverlay from "@workspace/app-ui/components/global-loading";
import { SettingsUI } from "@workspace/app-ui/components/ui/settings/index";
import type { Mode, NotificationStatus, NekoShareContextType, Router } from "@workspace/app-ui/types/context";

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
}

const NekoShareProvider = <TRouter extends Router>({ router, children }: NekoShareProviderProps<TRouter>) => {
	const [isGlobalLoading, setIsGlobalLoading] = useState(true);
	const [mode, setMode] = useState<Mode>("home");
	const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>("off");
	const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const toggleNotification = useCallback(() => {
		setNotificationStatus((previousStatus) => (previousStatus === "on" ? "off" : "on"));
	}, []);

	const handleSetGlobalLoading = useCallback((isLoading: boolean) => {
		if (loadingTimeoutRef.current) {
			clearTimeout(loadingTimeoutRef.current);
			loadingTimeoutRef.current = null;
		}

		if (isLoading) {
			requestAnimationFrame(() => {
				setIsGlobalLoading(isLoading);
			});
		} else {
			loadingTimeoutRef.current = setTimeout(() => {
				setIsGlobalLoading(isLoading);
				loadingTimeoutRef.current = null;
			}, 300);
		}
	}, []);

	const handleSetMode = useCallback((newMode: Mode) => {
		setMode(newMode);
	}, []);

	const handleSetNotification = useCallback((status: NotificationStatus) => {
		setNotificationStatus(status);
	}, []);

	const contextValue = useMemo<NekoShareContextType>(
		() => ({
			isGlobalLoading,
			mode,
			notificationStatus,
			router,
			setGlobalLoading: handleSetGlobalLoading,
			setMode: handleSetMode,
			setNotificationStatus: handleSetNotification,
			toggleNotification,
		}),
		[
			isGlobalLoading,
			mode,
			notificationStatus,
			router,
			handleSetGlobalLoading,
			handleSetMode,
			handleSetNotification,
			toggleNotification,
		]
	);

	const isHomeMode = mode === "home";
	const contentAnimationState = isHomeMode ? CONTENT_SCALE_ACTIVE : CONTENT_SCALE_INACTIVE;

	useEffect(() => {
		let isMounted = true;
		const initializeApp = async () => {
			await new Promise((resolve) => setTimeout(resolve, 1000));
			if (isMounted) {
				setIsGlobalLoading(false);
			}
		};
		initializeApp();
		return () => {
			isMounted = false;
		};
	}, []);

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
			<AnimatePresence>{isGlobalLoading && <LoadingOverlay key="global-loading-overlay" />}</AnimatePresence>
			<Toaster richColors position="top-right" offset={{top: "3rem"}}/>
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

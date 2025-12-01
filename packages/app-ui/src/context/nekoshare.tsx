import { createContext, useContext, useState, useMemo, useCallback, memo, type ReactNode, type FC } from "react";
import LoadingOverlay from "@workspace/app-ui/components/global-loading";
import { AnimatePresence, motion, type Transition, type Variants } from "motion/react";
import { SettingsUI } from "../components/ui/settings/index";

type Mode = "home" | "settings";
type NotificationStatus = "on" | "off";

interface NekoShareContextType {
	isGlobalLoading: boolean;
	mode: Mode;
	notification: NotificationStatus;
	setGlobalLoading: (loading: boolean) => void;
	setMode: (mode: Mode) => void;
	setNotification: (status: NotificationStatus) => void;
	toggleNotification: () => void;
}

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

const NekoShareProvider: FC<{ children: ReactNode; authClient: any }> = ({ authClient, children }) => {
	const [isGlobalLoading, setGlobalLoading] = useState(false);
	const [mode, setMode] = useState<Mode>("home");
	const [notification, setNotification] = useState<NotificationStatus>("off");

	const toggleNotification = useCallback(() => {
		setNotification((prev) => (prev === "on" ? "off" : "on"));
	}, []);

	const handleSetGlobalLoading = useCallback((loading: boolean) => {
		setGlobalLoading(loading);
	}, []);

	const handleSetMode = useCallback((newMode: Mode) => {
		setMode(newMode);
	}, []);

	const handleSetNotification = useCallback((status: NotificationStatus) => {
		setNotification(status);
	}, []);

	const contextValue = useMemo<NekoShareContextType>(
		() => ({
			isGlobalLoading,
			mode,
			notification,
			setGlobalLoading: handleSetGlobalLoading,
			setMode: handleSetMode,
			setNotification: handleSetNotification,
			toggleNotification,
		}),
		[
			isGlobalLoading,
			mode,
			notification,
			handleSetGlobalLoading,
			handleSetMode,
			handleSetNotification,
			toggleNotification,
		]
	);

	const isHome = mode === "home";
	const contentAnimateState = isHome ? CONTENT_SCALE_ACTIVE : CONTENT_SCALE_INACTIVE;

	return (
		<NekoShareContext.Provider value={contextValue}>
			<div className="relative h-screen overflow-hidden">
				<motion.div
					className="h-full will-change-transform"
					initial={false}
					animate={contentAnimateState}
					transition={SPRING_TRANSITION}
				>
					{children}
				</motion.div>
				<AnimatePresence mode="wait">
					{!isHome && (
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
								<SettingsUI
									onLogout={() => {
										setMode("home");
									}}
								/>
							</motion.div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
			<LoadingOverlay loading={isGlobalLoading} />
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

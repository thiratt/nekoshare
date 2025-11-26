import React, { createContext, useContext, useState, useMemo } from "react";
import LoadingOverlay from "@workspace/app-ui/components/global-loading";
import { AnimatePresence, motion } from "motion/react";

// import { SettingPage } from "@workspace/app-ui/components/settings/index";

type Mode = "home" | "setting";
type NotificationStatus = "on" | "off";

interface NekoShareContextType {
	isGlobalLoading: boolean;
	mode: Mode;
	notification: NotificationStatus;
	setGlobalLoading: React.Dispatch<React.SetStateAction<boolean>>;
	setMode: React.Dispatch<React.SetStateAction<Mode>>;
	setNotification: React.Dispatch<React.SetStateAction<NotificationStatus>>;
	toggleNotification: () => void;
}

const NekoShareContext = createContext<NekoShareContextType | null>(null);

const NekoShareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isGlobalLoading, setGlobalLoading] = useState<boolean>(false);
	const [mode, setMode] = useState<Mode>("home");
	const [notification, setNotification] = useState<NotificationStatus>("off");

	const toggleNotification = () => {
		setNotification((prev) => (prev === "on" ? "off" : "on"));
	};

	const contextValue = useMemo<NekoShareContextType>(
		() => ({
			isGlobalLoading,
			mode,
			notification,
			setGlobalLoading,
			setMode,
			setNotification,
			toggleNotification,
		}),
		[isGlobalLoading, mode, notification]
	);

	return (
		<NekoShareContext.Provider value={contextValue}>
			<div className="relative h-screen overflow-hidden">
				<motion.div
					className="h-full"
					initial={{ scale: 1, y: 0 }}
					animate={{
						scale: mode === "home" ? 1 : 0.97,
						y: mode === "home" ? 0 : -10,
					}}
					transition={{ duration: 0.3, ease: "easeInOut" }}
				>
					{children}
				</motion.div>
				<AnimatePresence mode="wait">
					{mode !== "home" && (
						<motion.div
							key="setting-page"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.3, ease: "easeInOut" }}
							className="absolute inset-0 z-10"
						>
							{/* <SettingPage /> */}
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

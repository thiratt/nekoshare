import { AnimatePresence, motion } from "motion/react";
import { LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { useSidebar } from "@workspace/app-ui/hooks/use-sidebar";

export function NotificationSidebar() {
	const { notificationStatus, setNotificationStatus } = useNekoShare();
	const { toggleSidebar } = useSidebar();

	const handleClose = () => {
		setNotificationStatus("off");
		toggleSidebar();
	};
	
	return (
		<AnimatePresence mode="wait">
			{notificationStatus === "on" && (
				<motion.div
					key="sidebar"
					initial={{ width: 0, opacity: 0 }}
					animate={{ width: "24rem", opacity: 1 }}
					exit={{ width: 0, opacity: 0 }}
					className={cn("overflow-hidden flex flex-col py-4 border-r")}
				>
					<div className="flex items-center justify-between px-4">
						<h3 className="font-bold text-xl truncate">Notifications</h3>
						<Button size="icon" onClick={handleClose} className="group rounded-full">
							<LuX className="rotate-0 transition-transform group-hover:rotate-90 duration-200" />
						</Button>
					</div>
					<div className="px-4">content</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

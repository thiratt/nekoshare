import { X } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { motion } from "motion/react";

interface NotificationSidebarProps {
	isOpen: boolean;
	toggleSidebar: () => void;
}

export function NotificationSidebar({ toggleSidebar }: NotificationSidebarProps) {
	return (
		<motion.div
			key="sidebar"
			initial={{ width: 0, opacity: 0 }}
			animate={{ width: "24rem", opacity: 1 }}
			exit={{ width: 0, opacity: 0 }}
			className={cn("overflow-hidden flex flex-col py-4 border-r")}
		>
			<div className="flex items-center justify-between px-4">
				<h3 className="font-bold text-xl truncate">Notifications</h3>
				<Button size="icon" onClick={toggleSidebar} className="group rounded-full">
					<X className="rotate-0 transition-transform group-hover:rotate-90 duration-200" />
				</Button>
			</div>
			<div className="px-4">content</div>
		</motion.div>
	);
}

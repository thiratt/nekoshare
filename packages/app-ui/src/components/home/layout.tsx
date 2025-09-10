import { useEffect, useMemo } from "react";

import { AnimatePresence } from "motion/react";

import { HomeSidebar } from "../home-sidebar";
import { NotificationSidebar } from "../notification-sidebar";

interface HomeLayoutProps {
	title: string;
	children: React.ReactNode;
}

export function HomeLayout({ title, children }: HomeLayoutProps) {
	// const router = useRouter();
	// const { setGlobalLoading } = useNekoShare();

	// const getWelcomeKey = useMemo(() => {
	// 	const hour = new Date().getHours();
	// 	if (hour >= 5 && hour < 12) return "สวัสดีตอนเช้า";
	// 	if (hour >= 12 && hour < 17) return "สวัสดีตอนบ่าย";
	// 	return "สวัสดีตอนเย็น";
	// }, []);

	// useEffect(() => {
	// 	const timer = setTimeout(() => setGlobalLoading(false), 1000);
	// 	return () => clearTimeout(timer);
	// }, [setGlobalLoading]);

	return (
		<div className="min-h-svh flex flex-col">
			<div className="flex flex-1 divide-x">
				{/* <HomeSidebar
					linkComponent={Link}
					pathname={location.pathname}
					onSettings={onSettings}
					onNavigations={toggleSidebar}
					onSignout={onSignout}
				/> */}
				<div className="flex-1 bg-muted p-4">{children}</div>
				{/* <AnimatePresence mode="wait">
					{isOpen && <NotificationSidebar isOpen={isOpen} toggleSidebar={toggleSidebar} />}
				</AnimatePresence> */}
			</div>
		</div>
	);
}

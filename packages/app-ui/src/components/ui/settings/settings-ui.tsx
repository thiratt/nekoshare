import { useCallback, useEffect, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import { LuLogOut, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { SearchInput } from "@workspace/ui/components/search-input";

import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { authClient, invalidateSessionCache } from "@workspace/app-ui/lib/auth";
import { deleteDevice } from "@workspace/app-ui/lib/device-api";
import type { SettingCategory } from "@workspace/app-ui/types/settings";

import { CONTENT_TRANSITION, CONTENT_VARIANTS, OVERLAY_TRANSITION, OVERLAY_VARIANTS } from "./animations";
import { CategoryButton } from "./components";
import { CATEGORY_MAP, CONTENT_COMPONENTS, SETTING_CATEGORIES } from "./constants";
import { LogoutDialog } from "./dialogs";

export function SettingsUI() {
	const { router, setMode, setGlobalLoading, currentDevice } = useNekoShare();
	const [activeCategory, setActiveCategory] = useState<SettingCategory>("account");
	const [confirmLogout, setConfirmLogout] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isEscapeEnabled, setIsEscapeEnabled] = useState(true);

	const filteredCategories = searchQuery
		? SETTING_CATEGORIES.filter((category) => category.label.toLowerCase().includes(searchQuery.toLowerCase()))
		: SETTING_CATEGORIES;

	const handleClose = useCallback(() => setMode("home"), [setMode]);
	const clearSearch = useCallback(() => setSearchQuery(""), []);
	const handleCategorySelect = useCallback((id: SettingCategory) => setActiveCategory(id), []);

	const handleDialogActive = useCallback((value: boolean) => {
		if (!value) {
			setIsEscapeEnabled(false);
		} else {
			const timeoutId = setTimeout(() => setIsEscapeEnabled(true), 100);
			return () => clearTimeout(timeoutId);
		}
	}, []);

	const handleLogoutClick = useCallback(() => {
		setIsEscapeEnabled(false);
		setConfirmLogout(true);
	}, []);

	const handleLogoutDialogChange = useCallback((open: boolean) => {
		setConfirmLogout(open);
		if (!open) {
			setTimeout(() => setIsEscapeEnabled(true), 100);
		}
	}, []);

	const onLogout = useCallback(async () => {
		setGlobalLoading(true);

		try {
			if (currentDevice) {
				await deleteDevice(currentDevice.id);
			}
		} catch (error) {
			console.error("Failed to delete device on logout:", error);
		}

		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					invalidateSessionCache();
					setIsEscapeEnabled(false);
					setMode("home");
					router.navigate({ to: "/login" });
				},
			},
		});
	}, [router, setMode, currentDevice, setGlobalLoading]);

	useEffect(() => {
		if (!isEscapeEnabled) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				setMode("home");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isEscapeEnabled, setMode]);

	const activeCategoryLabel = CATEGORY_MAP.get(activeCategory)?.label ?? "";
	const ContentComponent = CONTENT_COMPONENTS[activeCategory];
	const contentProps = activeCategory === "account" ? { onDialogActive: handleDialogActive } : {};

	return (
		<motion.div
			key="overlay"
			variants={OVERLAY_VARIANTS}
			initial="initial"
			animate="animate"
			exit="exit"
			transition={OVERLAY_TRANSITION}
			className="flex fixed inset-0 h-screen w-screen z-20"
			role="dialog"
			aria-modal="true"
			aria-label="Settings"
		>
			<div className="w-full bg-background/90 grid grid-cols-[280px_1fr] m-6 divide-x rounded-xl shadow-2xl overflow-hidden border">
				{/* Sidebar */}
				<aside className="flex flex-col p-5" aria-label="Settings categories">
					<SearchInput
						className="w-auto mb-2"
						searchQuery={searchQuery}
						onSearchQuery={setSearchQuery}
						onClearSearch={clearSearch}
						aria-label="Search settings"
					/>
					<div className="flex flex-1 flex-col justify-between">
						<div className="space-y-1" role="tablist" aria-orientation="vertical">
							{filteredCategories.map((category) => (
								<CategoryButton
									key={category.id}
									category={category}
									isActive={activeCategory === category.id}
									onClick={handleCategorySelect}
								/>
							))}
						</div>
						<Button className="justify-start gap-2" variant="ghost" onClick={handleLogoutClick}>
							<LuLogOut aria-hidden />
							ออกจากระบบ
						</Button>
					</div>
				</aside>

				{/* Main content */}
				<main className="flex-1 flex flex-col overflow-hidden">
					<header className="flex justify-between items-center p-6 border-b">
						<h2 className="text-2xl font-semibold">{activeCategoryLabel}</h2>
						<Button
							className="group rounded-full"
							variant="outline"
							size="icon"
							onClick={handleClose}
							aria-label="Close settings"
						>
							<LuX
								className="rotate-0 transition-transform group-hover:rotate-90 duration-200"
								aria-hidden
							/>
						</Button>
					</header>
					<div className="flex-1 p-6 h-1 pb-0">
						<AnimatePresence mode="wait" initial={false}>
							<motion.div
								key={activeCategory}
								variants={CONTENT_VARIANTS}
								initial="initial"
								animate="animate"
								exit="exit"
								transition={CONTENT_TRANSITION}
								className="h-full"
							>
								<ContentComponent {...contentProps} />
							</motion.div>
						</AnimatePresence>
					</div>
				</main>
			</div>

			<LogoutDialog open={confirmLogout} onOpenChange={handleLogoutDialogChange} onConfirm={onLogout} />
		</motion.div>
	);
}

import { useCallback, useEffect, useState, useMemo, memo, type FC } from "react";

import { motion, AnimatePresence, type Transition, type Variants } from "motion/react";
import type { IconType } from "react-icons";
import { LuBell, LuDatabase, LuGlobe, LuKeyboard, LuLogOut, LuPalette, LuShield, LuUser, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { SearchInput } from "@workspace/ui/components/search-input";
import { useNekoShare } from "@workspace/app-ui/context/nekoshare";
import { SettingAccountContent } from "./account";
import { SettingAppearanceContent } from "./appearance";
import { SettingNotificationsContent } from "./notifications";
import { SettingPrivacyContent } from "./privacy";
import { SettingStorageContent } from "./storage";
import { SettingAccessibilityContent } from "./accessibility";
import { SettingShortcutsContent } from "./shortcuts";

type SettingCategory = "account" | "appearance" | "notifications" | "privacy" | "data" | "accessibility" | "shortcuts";

interface SettingCategoryConfig {
	id: SettingCategory;
	label: string;
	icon: IconType;
}

const SETTING_CATEGORIES: readonly SettingCategoryConfig[] = [
	{ id: "account", label: "บัญชี", icon: LuUser },
	{ id: "appearance", label: "ลักษณะปรากฏ", icon: LuPalette },
	{ id: "notifications", label: "การแจ้งเตือน", icon: LuBell },
	{ id: "privacy", label: "ความเป็นส่วนตัว", icon: LuShield },
	{ id: "data", label: "ที่เก็บข้อมูล", icon: LuDatabase },
	{ id: "accessibility", label: "การช่วยสำหรับการเข้าถึง", icon: LuGlobe },
	{ id: "shortcuts", label: "แป้นพิมพ์ลัด", icon: LuKeyboard },
] as const;

const CATEGORY_MAP = new Map(SETTING_CATEGORIES.map((cat) => [cat.id, cat]));

const CONTENT_VARIANTS: Variants = {
	initial: { opacity: 0, y: 8 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -8 },
};

const OVERLAY_VARIANTS: Variants = {
	initial: { opacity: 0, scale: 0.98, y: 10 },
	animate: { opacity: 1, scale: 1, y: 0 },
	exit: { opacity: 0, scale: 0.98, y: 10 },
};

const SPRING_TRANSITION: Transition = {
	type: "spring",
	stiffness: 400,
	damping: 30,
};

const CONTENT_TRANSITION: Transition = {
	duration: 0.15,
	ease: [0.4, 0, 0.2, 1],
};

const OVERLAY_TRANSITION: Transition = {
	duration: 0.2,
	ease: "easeOut",
	delay: 0.1,
};

interface CategoryButtonProps {
	category: SettingCategoryConfig;
	isActive: boolean;
	onClick: (id: SettingCategory) => void;
}

const CategoryButton = memo<CategoryButtonProps>(function CategoryButton({ category, isActive, onClick }) {
	const Icon = category.icon;
	const handleClick = useCallback(() => onClick(category.id), [onClick, category.id]);

	return (
		<Button
			variant={isActive ? "default" : "ghost"}
			className="w-full justify-start gap-2"
			onClick={handleClick}
			aria-pressed={isActive}
		>
			<Icon aria-hidden />
			{category.label}
		</Button>
	);
});

interface ContentComponentProps {
	onDialogActive?: (value: boolean) => void;
}

const CONTENT_COMPONENTS: Record<SettingCategory, FC<ContentComponentProps>> = {
	account: SettingAccountContent as FC<ContentComponentProps>,
	appearance: SettingAppearanceContent,
	notifications: SettingNotificationsContent,
	privacy: SettingPrivacyContent,
	data: SettingStorageContent,
	accessibility: SettingAccessibilityContent,
	shortcuts: SettingShortcutsContent,
};

const t = (key: string): string => key;

export function SettingsUI() {
	const { setMode } = useNekoShare();
	const [activeCategory, setActiveCategory] = useState<SettingCategory>("account");
	const [confirmLogout, setConfirmLogout] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [isEscapeEnabled, setIsEscapeEnabled] = useState(true);

	const filteredCategories = useMemo(() => {
		const query = searchQuery.toLowerCase();
		if (!query) return SETTING_CATEGORIES;
		return SETTING_CATEGORIES.filter((category) => category.label.toLowerCase().includes(query));
	}, [searchQuery]);

	const handleClose = useCallback(() => setMode("home"), [setMode]);
	const clearSearch = useCallback(() => setSearchQuery(""), []);

	const handleCategorySelect = useCallback((id: SettingCategory) => {
		setActiveCategory(id);
	}, []);

	const handleDialogActive = useCallback((value: boolean) => {
		if (!value) {
			setIsEscapeEnabled(false);
		} else {
			const timeoutId = setTimeout(() => setIsEscapeEnabled(true), 100);
			return () => clearTimeout(timeoutId);
		}
	}, []);

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
			<div className="w-full bg-background/90 grid grid-cols-[280px_1fr] m-6 divide-x divide-muted-foreground/30 rounded-xl shadow-2xl overflow-hidden border border-muted-foreground/30">
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

				<main className="flex-1 flex flex-col overflow-hidden">
					<header className="flex justify-between items-center p-6 border-b border-muted-foreground/30">
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

			<AlertDialog open={confirmLogout} onOpenChange={handleLogoutDialogChange}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>ออกจากระบบ</AlertDialogTitle>
						<AlertDialogDescription>คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								// TODO: Implement logout logic
								// const deviceUid = await invoke("get_vault_key", { key: "device_uid" });
								// const res = await authFetch(API_ENDPOINT + "/auth/logout", {
								// 	method: "POST",
								// 	body: JSON.stringify({ deviceUid }),
								// });
								// if (res.ok) {
								// 	await invoke("remove_vault_key", { key: "access_token" });
								// 	await invoke("remove_vault_key", { key: "refresh_token" });
								// 	await invoke("remove_vault_key", { key: "locale" });
								// 	setMode("home");
								// 	router.push("/auth/login");
								// }
							}}
						>
							ออกจากระบบ
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</motion.div>
	);
}

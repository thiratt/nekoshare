import { motion, AnimatePresence, type Transition } from "motion/react";
import { X, User, Palette, Bell, Shield, Database, Globe, Keyboard, Check, LogOut } from "lucide-react";
import { useCallback, useEffect, useState, useMemo, memo } from "react";
// import { useTranslations } from "next-intl";
// import { invoke } from "@tauri-apps/api/core";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Separator } from "@workspace/ui/components/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
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
import { cn } from "@workspace/ui/lib/utils";
// import { authFetch } from "@workspace/ui/lib/auth-fetch";

// import { useZLink } from "@/hooks/use-zlink";
// import { API_ENDPOINT } from "@/config";

import { SearchInput } from "@workspace/ui/components/search-input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";

import { SettingAccountContent } from "./account";
import { SettingAppearanceContent } from "./appearance";
import { Progress } from "@workspace/ui/components/progress";

type SettingCategory = "account" | "appearance" | "notifications" | "privacy" | "data" | "accessibility" | "shortcuts";

const settingCategories = [
	{ id: "account" as const, label: "บัญชี", icon: User },
	{ id: "appearance" as const, label: "ลักษณะปรากฏ", icon: Palette },
	// { id: "notifications" as const, label: "Notifications", icon: Bell },
	// { id: "privacy" as const, label: "Privacy & Security", icon: Shield },
	{ id: "data" as const, label: "ที่เก็บข้อมูล", icon: Database },
	// { id: "accessibility" as const, label: "Accessibility", icon: Globe },
	// { id: "shortcuts" as const, label: "Keyboard Shortcuts", icon: Keyboard },
];

// Optimized animation configs - reduce complexity and duration
const fadeIn = { opacity: 0, y: 10 };
const fadeInVisible = { opacity: 1, y: 0 };
const scaleIn = { opacity: 0, scale: 0.98, y: 10 };
const scaleInVisible = { opacity: 1, scale: 1, y: 0 };

const transition: Transition = { duration: 0.2, ease: "easeOut", delay: 0.15 };

type ThemeOption = "light" | "dark" | "system";

interface ThemeButtonProps {
	value: ThemeOption;
	current: ThemeOption;
	onSelect: (theme: ThemeOption) => void;
	bgClass: string;
	icon: React.ReactNode;
}

// Memoized theme button to prevent unnecessary re-renders
const ThemeButton = memo(({ value, current, onSelect, bgClass, icon }: ThemeButtonProps) => {
	const isSelected = value === current;

	return (
		<button
			type="button"
			onClick={() => onSelect(value)}
			aria-label={`Select ${value} theme`}
			className={cn(
				"relative w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors duration-200",
				bgClass,
				isSelected ? "border-blue-500" : "border-background"
			)}
		>
			{icon}
			{isSelected && (
				<div className="absolute top-1 right-1 text-blue-500">
					<Check className="w-4 h-4" />
				</div>
			)}
		</button>
	);
});

ThemeButton.displayName = "ThemeButton";

export function SettingPage({
	xTheme,
	setMode,
}: {
	xTheme: {
		theme: "light" | "dark" | "system";
		setTheme: (theme: "light" | "dark" | "system") => void;
	};
	setMode: React.Dispatch<React.SetStateAction<"home" | "setting">>;
}) {
	const [activeCategory, setActiveCategory] = useState<SettingCategory>("account");
	const [confirmLogout, setConfirmLogout] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [settings, setSettings] = useState({
		theme: "system",
		notifications: true,
		emailNotifications: false,
		pushNotifications: true,
		autoSave: true,
		dataCollection: false,
		twoFactor: false,
		fontSize: "medium",
		reducedMotion: false,
		highContrast: false,
	});
	const [currentDialog, setCurrentDialog] = useState(true);
	// const t = useTranslations("home.settings.account");
	// const router = useZLink();

	// Memoized filtered categories to prevent recalculation
	const filteredCategories = useMemo(
		() => settingCategories.filter((category) => category.label.toLowerCase().includes(searchQuery.toLowerCase())),
		[searchQuery]
	);

	// Memoized handlers to prevent recreation
	const handleClose = useCallback(() => setMode("home"), [setMode]);

	const updateSetting = useCallback((key: keyof typeof settings, value: (typeof settings)[keyof typeof settings]) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	}, []);

	const clearSearch = useCallback(() => setSearchQuery(""), []);

	const t = (message: string) => message;

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (currentDialog && e.key === "Escape") {
				setMode("home");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [currentDialog, setMode]);

	// Memoized setting content components to prevent unnecessary re-renders
	const settingContent = useMemo(() => {
		switch (activeCategory) {
			case "account":
				return (
					<SettingAccountContent
						onDialogActive={(value) => {
							if (!value) {
								setCurrentDialog(value);
							} else {
								setTimeout(() => {
									setCurrentDialog(value);
								}, 100);
							}
						}}
					/>
				);

			case "appearance":
				return <SettingAppearanceContent theme={xTheme.theme} setTheme={xTheme.setTheme} />;

			// case "notifications":
			// 	return (
			// 		<div className="space-y-4">
			// 			<Card>
			// 				<CardHeader>
			// 					<CardTitle>Notification Preferences</CardTitle>
			// 					<CardDescription>Choose how you want to be notified</CardDescription>
			// 				</CardHeader>
			// 				<CardContent className="space-y-4">
			// 					<div className="flex items-center justify-between">
			// 						<div className="space-y-0.5">
			// 							<Label>Enable Notifications</Label>
			// 							<p className="text-sm text-muted-foreground">
			// 								Receive notifications from the app
			// 							</p>
			// 						</div>
			// 						<Switch
			// 							checked={settings.notifications}
			// 							onCheckedChange={(checked) => updateSetting("notifications", checked)}
			// 						/>
			// 					</div>
			// 					<Separator />
			// 					<div className="flex items-center justify-between">
			// 						<div className="space-y-0.5">
			// 							<Label>Email Notifications</Label>
			// 							<p className="text-sm text-muted-foreground">Receive updates via email</p>
			// 						</div>
			// 						<Switch
			// 							checked={settings.emailNotifications}
			// 							onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
			// 						/>
			// 					</div>
			// 					<div className="flex items-center justify-between">
			// 						<div className="space-y-0.5">
			// 							<Label>Push Notifications</Label>
			// 							<p className="text-sm text-muted-foreground">Receive push notifications</p>
			// 						</div>
			// 						<Switch
			// 							checked={settings.pushNotifications}
			// 							onCheckedChange={(checked) => updateSetting("pushNotifications", checked)}
			// 						/>
			// 					</div>
			// 				</CardContent>
			// 			</Card>
			// 		</div>
			// 	);

			// case "privacy":
			// 	return (
			// 		<div className="space-y-6">
			// 			<Card>
			// 				<CardHeader>
			// 					<CardTitle>Privacy Settings</CardTitle>
			// 					<CardDescription>Control your privacy and data sharing preferences</CardDescription>
			// 				</CardHeader>
			// 				<CardContent className="space-y-4">
			// 					<div className="flex items-center justify-between">
			// 						<div className="space-y-0.5">
			// 							<Label>Data Collection</Label>
			// 							<p className="text-sm text-muted-foreground">Allow anonymous usage analytics</p>
			// 						</div>
			// 						<Switch
			// 							checked={settings.dataCollection}
			// 							onCheckedChange={(checked) => updateSetting("dataCollection", checked)}
			// 						/>
			// 					</div>
			// 					<Separator />
			// 					<Button variant="outline">Download My Data</Button>
			// 					<Button variant="destructive">Delete Account</Button>
			// 				</CardContent>
			// 			</Card>
			// 		</div>
			// 	);

			case "data":
				return (
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>ที่เก็บข้อมูล</CardTitle>
								<CardDescription>จัดการข้อมูลและการตั้งค่าการจัดเก็บของคุณ</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{/* <div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Auto-save</Label>
										<p className="text-sm text-muted-foreground">Automatically save your work</p>
									</div>
									<Switch
										checked={settings.autoSave}
										onCheckedChange={(checked) => updateSetting("autoSave", checked)}
									/>
								</div>
								<Separator /> */}
								<div className="space-y-2">
									<Label>พื้นที่จัดเก็บที่ใช้ไป</Label>
									<Progress value={2} />
									{/* <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
										<div
											className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-1000 ease-out"
											style={{ width: "45%" }}
										/>
									</div> */}
									<p className="text-sm text-muted-foreground">20 GB จาก 1 TB ถูกใช้แล้ว</p>
								</div>
								<Button variant="outline">ล้างแคช</Button>
							</CardContent>
						</Card>
					</div>
				);

			// case "accessibility":
			// 	return (
			// 		<div className="space-y-6">
			// 			<Card>
			// 				<CardHeader>
			// 					<CardTitle>Accessibility</CardTitle>
			// 					<CardDescription>Customize the app for better accessibility</CardDescription>
			// 				</CardHeader>
			// 				<CardContent className="space-y-4">
			// 					<div className="flex items-center justify-between">
			// 						<div className="space-y-0.5">
			// 							<Label>Reduced Motion</Label>
			// 							<p className="text-sm text-muted-foreground">
			// 								Minimize animations and transitions
			// 							</p>
			// 						</div>
			// 						<Switch
			// 							checked={settings.reducedMotion}
			// 							onCheckedChange={(checked) => updateSetting("reducedMotion", checked)}
			// 						/>
			// 					</div>
			// 					<div className="flex items-center justify-between">
			// 						<div className="space-y-0.5">
			// 							<Label>High Contrast</Label>
			// 							<p className="text-sm text-muted-foreground">
			// 								Increase contrast for better visibility
			// 							</p>
			// 						</div>
			// 						<Switch
			// 							checked={settings.highContrast}
			// 							onCheckedChange={(checked) => updateSetting("highContrast", checked)}
			// 						/>
			// 					</div>
			// 				</CardContent>
			// 			</Card>
			// 		</div>
			// 	);

			// case "shortcuts":
			// 	return (
			// 		<div className="space-y-6">
			// 			<Card>
			// 				<CardHeader>
			// 					<CardTitle>Keyboard Shortcuts</CardTitle>
			// 					<CardDescription>View and customize keyboard shortcuts</CardDescription>
			// 				</CardHeader>
			// 				<CardContent className="space-y-4">
			// 					<div className="space-y-3">
			// 						<div className="flex justify-between items-center">
			// 							<span>Open Settings</span>
			// 							<kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd + ,</kbd>
			// 						</div>
			// 						<div className="flex justify-between items-center">
			// 							<span>Close Settings</span>
			// 							<kbd className="px-2 py-1 text-xs bg-muted rounded">Esc</kbd>
			// 						</div>
			// 						<div className="flex justify-between items-center">
			// 							<span>Search</span>
			// 							<kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd + K</kbd>
			// 						</div>
			// 						<div className="flex justify-between items-center">
			// 							<span>New Item</span>
			// 							<kbd className="px-2 py-1 text-xs bg-muted rounded">Cmd + N</kbd>
			// 						</div>
			// 					</div>
			// 					<Button variant="outline">Customize Shortcuts</Button>
			// 				</CardContent>
			// 			</Card>
			// 		</div>
			// 	);

			default:
				return null;
		}
	}, [activeCategory, settings, updateSetting]);

	return (
		<motion.div
			key="overlay"
			initial={scaleIn}
			animate={scaleInVisible}
			exit={scaleIn}
			transition={transition}
			className="flex fixed top-0 h-screen w-screen z-20"
		>
			<div className="w-full bg-background/90 grid grid-cols-[280px_1fr] m-6 divide-x divide-muted-foreground/30 rounded-xl shadow-2xl overflow-hidden border border-muted-foreground/30">
				{/* Sidebar */}
				<div className="flex flex-col p-5">
					<SearchInput
						className="w-auto mb-2"
						searchQuery={searchQuery}
						onSearchQuery={setSearchQuery}
						onClearSearch={clearSearch}
					/>
					<div className="flex flex-1 flex-col justify-between">
						<div className="space-y-1">
							{filteredCategories.map((category) => {
								const Icon = category.icon;
								const isActive = activeCategory === category.id;

								return (
									<Button
										key={category.id}
										variant={isActive ? "default" : "ghost"}
										className="w-full justify-start gap-2"
										onClick={() => setActiveCategory(category.id)}
									>
										<Icon />
										{category.label}
									</Button>
								);
							})}
						</div>
						<Button
							className="justify-start gap-2"
							variant="ghost"
							onClick={() => {
								setCurrentDialog(false);
								setConfirmLogout(true);
							}}
						>
							<LogOut />
							Log Out
						</Button>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex-1 flex flex-col overflow-hidden">
					<div className="flex justify-between items-center p-6 border-b border-muted-foreground/30">
						<h2 className="text-2xl font-semibold">
							{settingCategories.find((cat) => cat.id === activeCategory)?.label}
						</h2>
						<Button className="group rounded-full" variant="outline" size="icon" onClick={handleClose}>
							<X className="rotate-0 transition-transform group-hover:rotate-90 duration-200" />
						</Button>
					</div>
					<div className="flex-1 p-6 h-1 pb-0">
						<AnimatePresence mode="wait" initial={false}>
							<motion.div
								key={activeCategory}
								initial={fadeIn}
								animate={fadeInVisible}
								exit={fadeIn}
								transition={{ duration: 0.15 }}
							>
								{settingContent}
							</motion.div>
						</AnimatePresence>
					</div>
				</div>
			</div>

			{/* Logout Dialog */}
			<AlertDialog
				open={confirmLogout}
				onOpenChange={(open) => {
					setConfirmLogout(open);
					setTimeout(() => {
						setCurrentDialog(!open);
					}, 100);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("logout.title")}</AlertDialogTitle>
						<AlertDialogDescription>{t("logout.description")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("logout.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
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
							{t("logout.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</motion.div>
	);
}

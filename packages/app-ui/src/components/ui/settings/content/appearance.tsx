import { memo, type ReactNode, useCallback, useEffect, useState } from "react";
import type { IconType } from "react-icons";

import { LuCheck, LuMonitorSmartphone, LuMoon, LuSun } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { useToast } from "@workspace/ui/hooks/use-toast";
import { cn } from "@workspace/ui/lib/utils";

import { EnglishFlagSvg } from "@workspace/app-ui/components/svgs/english";
import { ThaiFlagSvg } from "@workspace/app-ui/components/svgs/thai";
import { authClient, invalidateSessionCache, updateUserAppearance } from "@workspace/app-ui/lib/auth";
import { useTheme } from "@workspace/app-ui/providers/theme-provider";
import type { Language, LanguageOption } from "@workspace/app-ui/types/settings";
import type { Theme } from "@workspace/app-ui/types/theme";

import { SettingSwitch } from "../components";

import { useAppI18n } from "@workspace/i18n/react";

interface SettingAppearanceContentProps {
	onUnsavedChange?: (dirty: boolean, discard?: () => void) => void;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
	{
		id: "th",
		label: "Thai",
		nativeLabel: "ไทย",
		flag: <ThaiFlagSvg />,
	},
	{ id: "en", label: "English", nativeLabel: "English", flag: <EnglishFlagSvg /> },
] as const;

interface LocalThemeOption {
	id: Theme;
	icon: IconType;
	bgClass: string;
	iconClass: string;
}

const THEME_OPTIONS: readonly LocalThemeOption[] = [
	{
		id: "light",
		icon: LuSun,
		bgClass: "bg-white",
		iconClass: "text-black",
	},
	{
		id: "dark",
		icon: LuMoon,
		bgClass: "bg-black",
		iconClass: "text-white group-hover:-rotate-90",
	},
	{
		id: "system",
		icon: LuMonitorSmartphone,
		bgClass: "bg-background",
		iconClass: "group-hover:rotate-none group-hover:scale-125",
	},
];

const CheckIndicator = memo(function CheckIndicator() {
	return (
		<div
			className="absolute top-0 right-0 flex items-center justify-center bg-foreground rounded-full text-background p-[3px] animate-in zoom-in"
			aria-hidden="true"
		>
			<LuCheck size={16} />
		</div>
	);
});

interface LocalIconElementProps {
	className?: string;
	children: ReactNode;
}

const IconElement = memo(function IconElement({ className, children }: LocalIconElementProps) {
	return (
		<div
			className={cn(
				"absolute inset-0 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300",
				className,
			)}
			aria-hidden="true"
		>
			{children}
		</div>
	);
});

interface LocalThemeButtonProps {
	label: string;
	option: LocalThemeOption;
	isSelected: boolean;
	onThemeSelect: (theme: Theme) => void;
	disabled?: boolean;
	className?: string;
	role?: string;
	"aria-checked"?: boolean;
}

const ThemeButton = memo(function ThemeButton({
	label,
	option,
	isSelected,
	onThemeSelect,
	disabled = false,
	className,
	...props
}: LocalThemeButtonProps) {
	const { id, icon: Icon, bgClass, iconClass } = option;

	const handleClick = useCallback(() => {
		if (disabled) {
			return;
		}

		onThemeSelect(id);
	}, [disabled, onThemeSelect, id]);

	return (
		<button
			type="button"
			className={cn(
				"cursor-pointer relative w-16 h-16 border-2 border-foreground rounded-full transition-all",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				!disabled && "group",
				bgClass,
				className,
			)}
			onClick={handleClick}
			disabled={disabled}
			aria-label={label}
			aria-pressed={isSelected}
			{...props}
		>
			<IconElement className={iconClass}>
				<Icon />
			</IconElement>
			{isSelected && <CheckIndicator />}
		</button>
	);
});

export const SettingAppearanceContent = memo(function SettingAppearanceContent({
	onUnsavedChange,
}: SettingAppearanceContentProps) {
	const {
		accountThemeSyncPaused,
		setAccountThemeSyncPaused,
		setSyncThemeFromAccount,
		setTheme,
		syncThemeFromAccount,
		theme,
	} = useTheme();
	const { data: sessionData, refetch } = authClient.useSession();
	const { toast } = useToast();
	const { language, setLanguage, setSyncLanguageFromAccount, syncLanguageFromAccount, t } = useAppI18n();

	const userPreferences =
		(sessionData?.user as { language?: Language | null; theme?: Theme | null } | undefined) ?? null;
	const userLanguage = userPreferences?.language ?? null;
	const userTheme = userPreferences?.theme ?? null;
	const [savedTheme, setSavedTheme] = useState<Theme>(theme);
	const [draftTheme, setDraftTheme] = useState<Theme>(theme);
	const [draftSyncThemeFromAccount, setDraftSyncThemeFromAccount] = useState(syncThemeFromAccount);
	const [savedLanguage, setSavedLanguage] = useState<Language>(language);
	const [draftLanguage, setDraftLanguage] = useState<Language>(language);
	const [draftSyncLanguageFromAccount, setDraftSyncLanguageFromAccount] = useState(syncLanguageFromAccount);
	const [isSavingTheme, setIsSavingTheme] = useState(false);
	const [isSavingLanguage, setIsSavingLanguage] = useState(false);

	const hasUnsavedTheme = draftTheme !== savedTheme;
	const hasUnsavedThemeSync = draftSyncThemeFromAccount !== syncThemeFromAccount;
	const hasUnsavedLanguageValue = draftLanguage !== savedLanguage;
	const hasUnsavedLanguageSync = draftSyncLanguageFromAccount !== syncLanguageFromAccount;
	const hasUnsavedLanguage = hasUnsavedLanguageValue || hasUnsavedLanguageSync;
	const hasChanges = hasUnsavedTheme || hasUnsavedThemeSync || hasUnsavedLanguage;

	useEffect(() => {
		if (!hasUnsavedTheme && savedTheme !== theme) {
			setSavedTheme(theme);
			setDraftTheme(theme);
		}
	}, [hasUnsavedTheme, savedTheme, theme]);

	useEffect(() => {
		if (!hasUnsavedThemeSync && draftSyncThemeFromAccount !== syncThemeFromAccount) {
			setDraftSyncThemeFromAccount(syncThemeFromAccount);
		}
	}, [draftSyncThemeFromAccount, hasUnsavedThemeSync, syncThemeFromAccount]);

	useEffect(() => {
		if (!hasUnsavedLanguageValue && savedLanguage !== language) {
			setSavedLanguage(language);
			setDraftLanguage(language);
		}
	}, [hasUnsavedLanguageValue, language, savedLanguage]);

	useEffect(() => {
		if (!hasUnsavedLanguageSync && draftSyncLanguageFromAccount !== syncLanguageFromAccount) {
			setDraftSyncLanguageFromAccount(syncLanguageFromAccount);
		}
	}, [draftSyncLanguageFromAccount, hasUnsavedLanguageSync, syncLanguageFromAccount]);

	useEffect(() => {
		const shouldPauseAccountThemeSync = syncThemeFromAccount && hasUnsavedTheme;
		if (accountThemeSyncPaused !== shouldPauseAccountThemeSync) {
			setAccountThemeSyncPaused(shouldPauseAccountThemeSync);
		}
	}, [accountThemeSyncPaused, hasUnsavedTheme, setAccountThemeSyncPaused, syncThemeFromAccount]);

	useEffect(() => {
		return () => {
			setAccountThemeSyncPaused(false);
		};
	}, [setAccountThemeSyncPaused]);

	const discardChanges = useCallback(() => {
		if (hasUnsavedTheme) {
			setTheme(savedTheme, { persist: false });
		}

		setDraftTheme(savedTheme);
		setDraftSyncThemeFromAccount(syncThemeFromAccount);
		setDraftLanguage(savedLanguage);
		setDraftSyncLanguageFromAccount(syncLanguageFromAccount);
	}, [hasUnsavedTheme, savedLanguage, savedTheme, setTheme, syncLanguageFromAccount, syncThemeFromAccount]);

	useEffect(() => {
		onUnsavedChange?.(hasChanges, discardChanges);
	}, [discardChanges, hasChanges, onUnsavedChange]);

	const handleThemeChange = useCallback(
		(newTheme: Theme) => {
			if (isSavingTheme) {
				return;
			}

			const shouldPauseAccountThemeSync = syncThemeFromAccount && newTheme !== savedTheme;
			if (accountThemeSyncPaused !== shouldPauseAccountThemeSync) {
				setAccountThemeSyncPaused(shouldPauseAccountThemeSync);
			}

			setDraftTheme(newTheme);
			setTheme(newTheme, { persist: false });
		},
		[accountThemeSyncPaused, isSavingTheme, savedTheme, setAccountThemeSyncPaused, setTheme, syncThemeFromAccount],
	);

	const handleThemeSyncToggle = useCallback(
		(checked: boolean) => {
			if (isSavingTheme) {
				return;
			}

			setDraftSyncThemeFromAccount(checked);
		},
		[isSavingTheme],
	);

	const handleLanguageChange = useCallback(
		(value: string) => {
			if (isSavingLanguage) {
				return;
			}

			setDraftLanguage(value as Language);
		},
		[isSavingLanguage],
	);

	const handleSyncToggle = useCallback(
		(checked: boolean) => {
			if (isSavingLanguage) {
				return;
			}

			setDraftSyncLanguageFromAccount(checked);
		},
		[isSavingLanguage],
	);

	const handleSaveTheme = useCallback(async () => {
		if (isSavingTheme) {
			return;
		}

		setIsSavingTheme(true);

		try {
			const nextTheme = draftTheme;
			const shouldUpdateAccount = draftSyncThemeFromAccount && !!sessionData?.user && userTheme !== nextTheme;
			const result = shouldUpdateAccount ? await updateUserAppearance({ theme: nextTheme }) : null;
			if (result?.error) {
				toast.error(t("settings.appearance.theme.saveError"));
				return;
			}

			if (shouldUpdateAccount) {
				invalidateSessionCache();
				await refetch();
			}

			if (syncThemeFromAccount !== draftSyncThemeFromAccount) {
				setSyncThemeFromAccount(draftSyncThemeFromAccount);
			}

			if (theme !== nextTheme || hasUnsavedTheme || hasUnsavedThemeSync) {
				setTheme(nextTheme);
			}

			setSavedTheme(nextTheme);
			setDraftTheme(nextTheme);
			toast.success(t("settings.appearance.theme.saveSuccess"));
		} catch (error) {
			console.error("Failed to save theme settings:", error);
			toast.error(t("settings.appearance.theme.saveError"));
		} finally {
			setIsSavingTheme(false);
		}
	}, [
		draftSyncThemeFromAccount,
		draftTheme,
		hasUnsavedTheme,
		hasUnsavedThemeSync,
		isSavingTheme,
		refetch,
		sessionData?.user,
		setSyncThemeFromAccount,
		setTheme,
		syncThemeFromAccount,
		t,
		theme,
		toast,
		userTheme,
	]);

	const handleSaveLanguage = useCallback(async () => {
		if (isSavingLanguage) {
			return;
		}

		setIsSavingLanguage(true);

		try {
			const nextLanguage = draftLanguage;
			const shouldUpdateAccount =
				draftSyncLanguageFromAccount && !!sessionData?.user && userLanguage !== nextLanguage;

			if (shouldUpdateAccount) {
				const result = await updateUserAppearance({ language: nextLanguage });
				if (result.error) {
					toast.error(t("settings.appearance.language.saveError"));
					return;
				}

				invalidateSessionCache();
				await refetch();
			}

			if (syncLanguageFromAccount !== draftSyncLanguageFromAccount) {
				setSyncLanguageFromAccount(draftSyncLanguageFromAccount);
			}

			if (language !== nextLanguage || hasUnsavedLanguageSync) {
				await setLanguage(nextLanguage);
			}

			setSavedLanguage(nextLanguage);
			setDraftLanguage(nextLanguage);
			toast.success(t("settings.appearance.language.saveSuccess"));
		} catch (error) {
			console.error("Failed to save language settings:", error);
			toast.error(t("settings.appearance.language.saveError"));
		} finally {
			setIsSavingLanguage(false);
		}
	}, [
		draftLanguage,
		draftSyncLanguageFromAccount,
		hasUnsavedLanguageSync,
		isSavingLanguage,
		language,
		refetch,
		sessionData?.user,
		setLanguage,
		setSyncLanguageFromAccount,
		syncLanguageFromAccount,
		t,
		toast,
		userLanguage,
	]);

	const selectedLanguage = LANGUAGE_OPTIONS.find((option) => option.id === draftLanguage);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.appearance.theme.title")}</CardTitle>
					<CardDescription>{t("settings.appearance.theme.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex gap-2" role="radiogroup" aria-label={t("settings.appearance.theme.title")}>
						{THEME_OPTIONS.map((option) => (
							<ThemeButton
								key={option.id}
								label={
									option.id === "light"
										? t("settings.appearance.theme.light")
										: option.id === "dark"
											? t("settings.appearance.theme.dark")
											: t("settings.appearance.theme.system")
								}
								option={option}
								isSelected={draftTheme === option.id}
								onThemeSelect={handleThemeChange}
								disabled={isSavingTheme}
								role="radio"
								aria-checked={draftTheme === option.id}
							/>
						))}
					</div>
					<SettingSwitch
						label={t("settings.appearance.theme.syncLabel")}
						description={t("settings.appearance.theme.syncDescription")}
						checked={draftSyncThemeFromAccount}
						onCheckedChange={handleThemeSyncToggle}
						disabled={isSavingTheme}
					/>
				</CardContent>
				<CardFooter className="justify-end">
					<Button
						onClick={handleSaveTheme}
						disabled={!(hasUnsavedTheme || hasUnsavedThemeSync) || isSavingTheme}
					>
						{t("common.actions.save")}
					</Button>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("settings.appearance.language.title")}</CardTitle>
					<CardDescription>{t("settings.appearance.language.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Select value={draftLanguage} onValueChange={handleLanguageChange} disabled={isSavingLanguage}>
						<SelectTrigger className="w-full max-w-xs" disabled={isSavingLanguage}>
							<SelectValue>
								{selectedLanguage && (
									<span className="flex gap-1">
										{selectedLanguage.flag}
										{selectedLanguage.nativeLabel}
										<span className="text-muted-foreground">({selectedLanguage.label})</span>
									</span>
								)}
							</SelectValue>
						</SelectTrigger>
						<SelectContent>
							{LANGUAGE_OPTIONS.map((option) => (
								<SelectItem key={option.id} value={option.id} className="flex gap-1">
									{option.flag}
									{option.nativeLabel}
									<span className="text-muted-foreground">({option.label})</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<SettingSwitch
						label={t("settings.appearance.language.syncLabel")}
						description={t("settings.appearance.language.syncDescription")}
						checked={draftSyncLanguageFromAccount}
						onCheckedChange={handleSyncToggle}
						disabled={isSavingLanguage}
					/>
				</CardContent>
				<CardFooter className="justify-end">
					<Button onClick={handleSaveLanguage} disabled={!hasUnsavedLanguage || isSavingLanguage}>
						{t("common.actions.save")}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
});

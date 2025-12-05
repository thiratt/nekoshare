import type { IconType } from "react-icons";

export type SettingCategory =
	| "account"
	| "appearance"
	| "notifications"
	| "privacy"
	| "data"
	| "accessibility"
	| "shortcuts";

export interface SettingCategoryConfig {
	id: SettingCategory;
	label: string;
	icon: IconType;
}

export interface CategoryButtonProps {
	category: SettingCategoryConfig;
	isActive: boolean;
	onClick: () => void;
}

export interface ContentComponentProps {
	linkComponent?: any;
}

// Account types
export type DialogKey = "avatar" | "changeEmail" | "deleteAccount" | "changePassword" | "twoFaAuthentication";

export type DialogState = Record<DialogKey, boolean>;

export interface SettingAccountContentProps {
	linkComponent?: any;
}

// Appearance types
export type Language = "th" | "en" | "ja" | "zh";

export interface LanguageOption {
	id: Language;
	label: string;
	nativeLabel: string;
	flag?: React.ReactNode;
}

export interface ThemeOption {
	id: import("./theme").Theme;
	icon: IconType;
	bgClass: string;
	label: string;
}

export interface IconElementProps {
	icon: IconType;
	className?: string;
}

export interface ThemeButtonProps {
	option: ThemeOption;
	isSelected: boolean;
	onClick: () => void;
}

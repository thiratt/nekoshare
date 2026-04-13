import type { IconType } from "react-icons";

import type { AppLanguage } from "@workspace/i18n/core";

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

// Account types
export type DialogKey = "avatar" | "changeEmail" | "deleteAccount" | "changePassword" | "twoFaAuthentication";

export type DialogState = Record<DialogKey, boolean>;

// Appearance types
export type Language = AppLanguage;

export interface LanguageOption {
	id: Language;
	label: string;
	nativeLabel: string;
	flag?: React.ReactNode;
}

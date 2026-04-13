import type { FC } from "react";

import { LuDatabase, LuKeyboard, LuPalette, LuUser } from "react-icons/lu";

import type { SettingCategory, SettingCategoryConfig } from "@workspace/app-ui/types/settings";

import {
	SettingAccessibilityContent,
	SettingAccountContent,
	SettingAppearanceContent,
	SettingNotificationsContent,
	SettingPrivacyContent,
	SettingShortcutsContent,
	SettingStorageContent,
} from "./content";

import type { AppTFunction } from "@workspace/i18n/resources";

export interface ContentComponentProps {
	onDialogActive?: (value: boolean) => void;
	onUnsavedChange?: (dirty: boolean, discard?: () => void) => void;
}

export function createSettingCategories(t: AppTFunction): readonly SettingCategoryConfig[] {
	return [
		{ id: "account", label: t("settings.categories.account"), icon: LuUser },
		{ id: "appearance", label: t("settings.categories.appearance"), icon: LuPalette },
		{ id: "data", label: t("settings.categories.data"), icon: LuDatabase },
		{ id: "shortcuts", label: t("settings.categories.shortcuts"), icon: LuKeyboard },
	] as const;
}

export function createCategoryMap(categories: readonly SettingCategoryConfig[]) {
	return new Map<SettingCategory, SettingCategoryConfig>(categories.map((category) => [category.id, category]));
}

export const CONTENT_COMPONENTS: Record<SettingCategory, FC<ContentComponentProps>> = {
	account: SettingAccountContent as FC<ContentComponentProps>,
	appearance: SettingAppearanceContent,
	notifications: SettingNotificationsContent,
	privacy: SettingPrivacyContent,
	data: SettingStorageContent,
	accessibility: SettingAccessibilityContent,
	shortcuts: SettingShortcutsContent,
};

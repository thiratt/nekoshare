import type { FC } from "react";
import { LuBell, LuDatabase, LuGlobe, LuKeyboard, LuPalette, LuShield, LuUser } from "react-icons/lu";

import type { SettingCategory, SettingCategoryConfig } from "@workspace/app-ui/types/settings";

export const SETTING_CATEGORIES: readonly SettingCategoryConfig[] = [
	{ id: "account", label: "บัญชี", icon: LuUser },
	{ id: "appearance", label: "ลักษณะปรากฏ", icon: LuPalette },
	{ id: "notifications", label: "การแจ้งเตือน", icon: LuBell },
	{ id: "privacy", label: "ความเป็นส่วนตัว", icon: LuShield },
	{ id: "data", label: "ที่เก็บข้อมูล", icon: LuDatabase },
	{ id: "accessibility", label: "การช่วยสำหรับการเข้าถึง", icon: LuGlobe },
	{ id: "shortcuts", label: "แป้นพิมพ์ลัด", icon: LuKeyboard },
] as const;

export const CATEGORY_MAP = new Map(SETTING_CATEGORIES.map((cat) => [cat.id, cat]));

export interface ContentComponentProps {
	onDialogActive?: (value: boolean) => void;
}

import {
	SettingAccountContent,
	SettingAppearanceContent,
	SettingNotificationsContent,
	SettingPrivacyContent,
	SettingStorageContent,
	SettingAccessibilityContent,
	SettingShortcutsContent,
} from "./content";

export const CONTENT_COMPONENTS: Record<SettingCategory, FC<ContentComponentProps>> = {
	account: SettingAccountContent as FC<ContentComponentProps>,
	appearance: SettingAppearanceContent,
	notifications: SettingNotificationsContent,
	privacy: SettingPrivacyContent,
	data: SettingStorageContent,
	accessibility: SettingAccessibilityContent,
	shortcuts: SettingShortcutsContent,
};

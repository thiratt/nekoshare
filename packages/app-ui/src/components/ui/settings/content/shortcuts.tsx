import { memo } from "react";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

import { ShortcutRow } from "../components";

import { useAppI18n } from "@workspace/i18n/react";
import type { AppTranslationKey } from "@workspace/i18n/resources";

const SHORTCUTS: ReadonlyArray<{ labelKey: AppTranslationKey; shortcut: string }> = [
	{ labelKey: "settings.shortcuts.openSettings", shortcut: "Cmd + ," },
	{ labelKey: "settings.shortcuts.closeSettings", shortcut: "Esc" },
	{ labelKey: "settings.shortcuts.search", shortcut: "Cmd + K" },
	{ labelKey: "settings.shortcuts.newItem", shortcut: "Cmd + N" },
] as const;

export const SettingShortcutsContent = memo(function SettingShortcutsContent() {
	const { t } = useAppI18n();

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.shortcuts.title")}</CardTitle>
					<CardDescription>{t("settings.shortcuts.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						{SHORTCUTS.map((shortcut) => (
							<ShortcutRow key={shortcut.shortcut} label={t(shortcut.labelKey)} shortcut={shortcut.shortcut} />
						))}
					</div>
					<Button variant="outline">{t("settings.shortcuts.customize")}</Button>
				</CardContent>
			</Card>
		</div>
	);
});

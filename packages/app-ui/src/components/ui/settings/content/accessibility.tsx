import { memo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

import { SettingSwitch } from "../components";

import { useAppI18n } from "@workspace/i18n/react";

export const SettingAccessibilityContent = memo(function SettingAccessibilityContent() {
	const { t } = useAppI18n();

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.accessibility.general.title")}</CardTitle>
					<CardDescription>{t("settings.accessibility.general.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingSwitch
						label={t("settings.accessibility.reduceMotion.label")}
						description={t("settings.accessibility.reduceMotion.description")}
					/>
				</CardContent>
			</Card>
		</div>
	);
});

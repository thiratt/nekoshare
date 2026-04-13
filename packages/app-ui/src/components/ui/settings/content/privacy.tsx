import { memo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

import { SettingSwitch } from "../components";

import { useAppI18n } from "@workspace/i18n/react";

export const SettingPrivacyContent = memo(function SettingPrivacyContent() {
	const { t } = useAppI18n();

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.privacy.general.title")}</CardTitle>
					<CardDescription>{t("settings.privacy.general.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingSwitch
						label={t("settings.privacy.analytics.label")}
						description={t("settings.privacy.analytics.description")}
					/>
				</CardContent>
			</Card>
		</div>
	);
});

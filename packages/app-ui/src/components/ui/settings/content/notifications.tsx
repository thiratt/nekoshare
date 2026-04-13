import { memo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

import { SettingSwitch } from "../components";

import { useAppI18n } from "@workspace/i18n/react";

export const SettingNotificationsContent = memo(function SettingNotificationsContent() {
	const { t } = useAppI18n();

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.notifications.general.title")}</CardTitle>
					<CardDescription>{t("settings.notifications.general.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingSwitch
						label={t("settings.notifications.system.label")}
						description={t("settings.notifications.system.description")}
					/>
					<Separator />
					<SettingSwitch
						label={t("settings.notifications.email.label")}
						description={t("settings.notifications.email.description")}
					/>
					<SettingSwitch
						label={t("settings.notifications.push.label")}
						description={t("settings.notifications.push.description")}
					/>
				</CardContent>
			</Card>
		</div>
	);
});

import { memo } from "react";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";

import { useAppI18n } from "@workspace/i18n/react";

export const SettingStorageContent = memo(function SettingStorageContent() {
	const { t } = useAppI18n();

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{t("settings.data.storage.title")}</CardTitle>
					<CardDescription>{t("settings.data.storage.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>{t("settings.data.storage.usedLabel")}</Label>
						<Progress value={2} />
						<p className="text-sm text-muted-foreground">{t("settings.data.storage.usedValue")}</p>
					</div>
					<Button variant="outline">{t("settings.data.storage.clearCache")}</Button>
				</CardContent>
			</Card>
		</div>
	);
});

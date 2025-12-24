import { memo } from "react";

import { Card, CardContent,CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

import { SettingSwitch } from "../components";

export const SettingPrivacyContent = memo(function SettingPrivacyContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>ทั่วไป</CardTitle>
					<CardDescription>ควบคุมความเป็นส่วนตัวและการตั้งค่าการแชร์ข้อมูลของคุณ</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingSwitch label="การเก็บข้อมูล" description="อนุญาตการวิเคราะห์การใช้งานแบบไม่ระบุชื่อ" />
				</CardContent>
			</Card>
		</div>
	);
});

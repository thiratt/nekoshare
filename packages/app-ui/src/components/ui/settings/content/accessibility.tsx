import { memo } from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";

import { SettingSwitch } from "../components";

export const SettingAccessibilityContent = memo(function SettingAccessibilityContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>ทั่วไป</CardTitle>
					<CardDescription>ปรับแต่งแอปเพื่อการเข้าถึงที่ดียิ่งขึ้น</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingSwitch label="ลดการเคลื่อนไหว" description="ลดการเคลื่อนไหวและการเปลี่ยนแปลง" />
				</CardContent>
			</Card>
		</div>
	);
});

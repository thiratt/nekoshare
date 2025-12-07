import { memo } from "react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";

import { SettingSwitch } from "../components";

export const SettingNotificationsContent = memo(function SettingNotificationsContent() {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>ทั่วไป</CardTitle>
					<CardDescription>เลือกวิธีที่คุณต้องการรับการแจ้งเตือน</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingSwitch label="เปิดใช้งานการแจ้งเตือน" description="รับการแจ้งเตือนจากแอป" />
					<Separator />
					<SettingSwitch label="อีเมลแจ้งเตือน" description="รับการอัปเดตผ่านทางอีเมล" />
					<SettingSwitch label="การแจ้งเตือนแบบพุช" description="รับการแจ้งเตือนแบบพุช" />
				</CardContent>
			</Card>
		</div>
	);
});

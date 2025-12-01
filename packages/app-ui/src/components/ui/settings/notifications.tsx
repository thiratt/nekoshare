import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";

export function SettingNotificationsContent() {
	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>ทั่วไป</CardTitle>
					<CardDescription>เลือกวิธีที่คุณต้องการรับการแจ้งเตือน</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>เปิดใช้งานการแจ้งเตือน</Label>
							<p className="text-sm text-muted-foreground">รับการแจ้งเตือนจากแอป</p>
						</div>
						<Switch />
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>อีเมลแจ้งเตือน</Label>
							<p className="text-sm text-muted-foreground">รับการอัปเดตผ่านทางอีเมล</p>
						</div>
						<Switch />
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>การแจ้งเตือนแบบพุช</Label>
							<p className="text-sm text-muted-foreground">รับการแจ้งเตือนแบบพุช</p>
						</div>
						<Switch />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

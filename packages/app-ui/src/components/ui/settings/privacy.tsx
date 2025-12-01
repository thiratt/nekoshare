import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Switch } from "@workspace/ui/components/switch";

export function SettingPrivacyContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>ทั่วไป</CardTitle>
					<CardDescription>ควบคุมความเป็นส่วนตัวและการตั้งค่าการแชร์ข้อมูลของคุณ</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label>การเก็บข้อมูล</Label>
							<p className="text-sm text-muted-foreground">อนุญาตการวิเคราะห์การใช้งานแบบไม่ระบุชื่อ</p>
						</div>
						<Switch />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

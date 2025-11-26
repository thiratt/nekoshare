import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";

export function SettingStorageContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>ที่เก็บข้อมูล</CardTitle>
					<CardDescription>จัดการข้อมูลและการตั้งค่าการจัดเก็บของคุณ</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* <div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label>Auto-save</Label>
										<p className="text-sm text-muted-foreground">Automatically save your work</p>
									</div>
									<Switch
										checked={settings.autoSave}
										onCheckedChange={(checked) => updateSetting("autoSave", checked)}
									/>
								</div>
								<Separator /> */}
					<div className="space-y-2">
						<Label>พื้นที่จัดเก็บที่ใช้ไป</Label>
						<Progress value={2} />
						{/* <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
										<div
											className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-1000 ease-out"
											style={{ width: "45%" }}
										/>
									</div> */}
						<p className="text-sm text-muted-foreground">20 GB จาก 1 TB ถูกใช้แล้ว</p>
					</div>
					<Button variant="outline">ล้างแคช</Button>
				</CardContent>
			</Card>
		</div>
	);
}

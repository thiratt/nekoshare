import { memo } from "react";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent,CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Progress } from "@workspace/ui/components/progress";

export const SettingStorageContent = memo(function SettingStorageContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>ที่เก็บข้อมูล</CardTitle>
					<CardDescription>จัดการข้อมูลและการตั้งค่าการจัดเก็บของคุณ</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>พื้นที่จัดเก็บที่ใช้ไป</Label>
						<Progress value={2} />
						<p className="text-sm text-muted-foreground">20 GB จาก 1 TB ถูกใช้แล้ว</p>
					</div>
					<Button variant="outline">ล้างแคช</Button>
				</CardContent>
			</Card>
		</div>
	);
});

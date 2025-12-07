import { memo } from "react";

import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@workspace/ui/components/card";

import { ShortcutRow } from "../components";

const SHORTCUTS = [
	{ label: "เปิดการตั้งค่า", shortcut: "Cmd + ," },
	{ label: "ปิดการตั้งค่า", shortcut: "Esc" },
	{ label: "ค้นหา", shortcut: "Cmd + K" },
	{ label: "รายการใหม่", shortcut: "Cmd + N" },
] as const;

export const SettingShortcutsContent = memo(function SettingShortcutsContent() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>ทางลัดแป้นพิมพ์</CardTitle>
					<CardDescription>ดูและปรับแต่งทางลัดแป้นพิมพ์</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						{SHORTCUTS.map((shortcut) => (
							<ShortcutRow key={shortcut.shortcut} label={shortcut.label} shortcut={shortcut.shortcut} />
						))}
					</div>
					<Button variant="outline">ปรับแต่งทางลัด</Button>
				</CardContent>
			</Card>
		</div>
	);
});

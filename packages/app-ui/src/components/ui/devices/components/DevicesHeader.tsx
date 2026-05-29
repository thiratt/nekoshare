import { LuPlus } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

export function DevicesHeader() {
	return (
		<header className="mb-4 flex items-start justify-between gap-4">
			<div>
				<h1 className="text-xl font-semibold tracking-tight text-foreground">อุปกรณ์</h1>
				<p className="text-sm text-muted-foreground">จัดการเครื่องของคุณที่ใช้ส่ง รับ และซิงก์ไฟล์โดยตรง</p>
			</div>

			<Button type="button" size="sm" className="rounded-full" disabled>
				<LuPlus />
				เพิ่มอุปกรณ์
			</Button>
		</header>
	);
}

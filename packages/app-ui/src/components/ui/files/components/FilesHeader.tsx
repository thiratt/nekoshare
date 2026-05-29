import { LuFolderOpen } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

export function FilesHeader() {
	return (
		<header className="mb-4 flex items-start justify-between gap-4">
			<div>
				<h1 className="text-xl font-semibold tracking-tight text-foreground">ไฟล์</h1>

				<p className="text-sm text-muted-foreground">
					ไฟล์ที่รับผ่าน Neko Share และจัดการต่อได้ทันที
				</p>
			</div>

			<Button type="button" variant="outline" size="sm" className="rounded-full">
				<LuFolderOpen />
				เปิดโฟลเดอร์รับไฟล์
			</Button>
		</header>
	);
}

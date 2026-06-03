import { LuRefreshCw } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

type FilesHeaderProps = {
	isLoading: boolean;
	onRefresh: () => void;
};

export function FilesHeader({ isLoading, onRefresh }: FilesHeaderProps) {
	return (
		<div className="mb-4 flex items-start justify-between gap-4">
			<div>
				<h1 className="text-xl font-semibold tracking-tight text-foreground">ไฟล์</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					ไฟล์ที่ส่งหรือรับผ่าน Neko Share พร้อมสถานะว่าไฟล์ยังอยู่ในเครื่องนี้หรือไม่
				</p>
			</div>

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="rounded-full"
				onClick={onRefresh}
				disabled={isLoading}
			>
				<LuRefreshCw className={isLoading ? "animate-spin" : undefined} />
				รีเฟรช
			</Button>
		</div>
	);
}

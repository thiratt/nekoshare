export function FilesEmptyState() {
	return (
		<div className="flex h-64 flex-col items-center justify-center gap-1 px-4 text-center text-muted-foreground">
			<p className="text-sm font-medium text-foreground">ยังไม่มีไฟล์จาก Neko Share</p>
			<p className="max-w-sm text-xs">
				ไฟล์ที่ส่งหรือรับผ่าน Neko Share จะแสดงที่นี่จากประวัติการโอนในเครื่องนี้
			</p>
		</div>
	);
}

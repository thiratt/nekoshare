export function FilesEmptyState() {
	return (
		<div className="flex flex-col items-center justify-center px-6 py-14 text-center">
			<p className="text-sm font-medium text-foreground">ไม่พบไฟล์</p>
			<p className="mt-1 text-sm text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือตัวกรองอีกครั้ง</p>
		</div>
	);
}

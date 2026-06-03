import { LuExternalLink, LuFileImage, LuFolderOpen, LuTrash } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

import { DetailPanelHeader } from "@workspace/app-ui/components/detail-panel";

import { fileTypeLabel } from "../constants";
import { formatFileSize, formatRelativeTime, getFileKind, getReceivedFileIcon } from "../utils/file-utils";
import type { FilesPageAction, FilesPageItem } from "../types";

type FileInspectorProps = {
	file: FilesPageItem;
	onClose: () => void;
	onMissingFile: FilesPageAction;
	onOpenFile: FilesPageAction;
	onRemoveFromList: FilesPageAction;
	onRevealFile: FilesPageAction;
};

function directionLabel(direction: FilesPageItem["direction"]) {
	return direction === "send" ? "ส่งออก" : "รับเข้า";
}

function availabilityLabel(availability: FilesPageItem["availability"]) {
	if (availability === "available") return "พร้อมใช้งาน";
	if (availability === "missing") return "ไม่พบไฟล์";
	return "กำลังตรวจสอบ";
}

export function FileInspector({ file, onMissingFile, onOpenFile, onRemoveFromList, onRevealFile }: FileInspectorProps) {
	const fileKind = getFileKind(file.fileName);
	const FileIcon = getReceivedFileIcon(fileKind);
	const isMissing = file.availability === "missing";

	function handleOpen() {
		if (isMissing) {
			void onMissingFile(file);
			return;
		}
		void onOpenFile(file);
	}

	function handleReveal() {
		if (isMissing) {
			void onMissingFile(file);
			return;
		}
		void onRevealFile(file);
	}

	return (
		<>
			<DetailPanelHeader />
			<div className="p-4">
				<div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-muted">
					{fileKind === "image" ? (
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<LuFileImage className="size-10" />
							<span className="text-xs">ไฟล์รูปภาพ</span>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<FileIcon className="size-10" />
							<span className="text-xs">ไม่มีตัวอย่าง</span>
						</div>
					)}
				</div>

				<div className="mb-4 space-y-2">
					<h3 className="truncate font-medium text-foreground">{file.fileName}</h3>

					<div className="space-y-1.5 text-xs text-muted-foreground">
						<DetailRow label="ชนิด" value={fileTypeLabel(fileKind)} />
						<DetailRow label="ขนาด" value={formatFileSize(file.size)} />
						<DetailRow label="ทิศทาง" value={directionLabel(file.direction)} />
						<DetailRow label="สถานะ" value={file.status === "completed" ? "เสร็จแล้ว" : "ล้มเหลว"} />
						<DetailRow label="ไฟล์ในเครื่อง" value={availabilityLabel(file.availability)} />
						{file.peerName ? <DetailRow label="อุปกรณ์/ผู้ใช้" value={file.peerName} /> : null}
						<DetailRow label="อัปเดตล่าสุด" value={formatRelativeTime(file.updatedAt)} />

						<div className="flex justify-between gap-4">
							<span>ตำแหน่ง</span>
							<span className="max-w-[170px] truncate text-right text-foreground">{file.filePath}</span>
						</div>
					</div>
				</div>

				{file.errorMessage ? (
					<p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
						{file.errorMessage}
					</p>
				) : null}

				<div className="space-y-2">
					<Button className="w-full rounded-full" size="sm" onClick={handleOpen}>
						<LuExternalLink />
						เปิด
					</Button>

					<div className="grid grid-cols-2 gap-2">
						<Button variant="outline" size="sm" className="rounded-full" onClick={handleReveal}>
							<LuFolderOpen className="size-3.5" />
							แสดงในโฟลเดอร์
						</Button>

						<Button
							variant="outline"
							size="sm"
							className="rounded-full"
							onClick={() => void onRemoveFromList(file)}
						>
							<LuTrash className="size-3.5" />
							ลบ
						</Button>
					</div>
				</div>
			</div>
		</>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4">
			<span>{label}</span>
			<span className="text-right text-foreground">{value}</span>
		</div>
	);
}

import { LuExternalLink, LuFileImage, LuFolderOpen, LuHistory, LuSend, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

import { fileTypeLabel } from "../constants";
import { getReceivedFileIcon } from "../utils/file-utils";
import type { ReceivedFile } from "../types";

type FileInspectorProps = {
	file: ReceivedFile;
	onClose: () => void;
};

export function FileInspector({ file, onClose }: FileInspectorProps) {
	const FileIcon = getReceivedFileIcon(file.type);

	return (
		<aside className="overflow-hidden rounded-2xl border bg-card shadow-sm">
			<div className="flex items-center justify-between border-b px-4 py-3">
				<h2 className="text-sm font-medium text-foreground">รายละเอียด</h2>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-8 rounded-full"
					onClick={onClose}
					title="ปิด"
				>
					<LuX className="size-4" />
				</Button>
			</div>

			<div className="p-4">
				<div className="mb-4 flex aspect-video items-center justify-center rounded-xl bg-muted">
					{file.type === "image" ? (
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<LuFileImage className="size-10" />
							<span className="text-xs">ตัวอย่างรูปภาพ</span>
						</div>
					) : (
						<div className="flex flex-col items-center gap-2 text-muted-foreground">
							<FileIcon className="size-10" />
							<span className="text-xs">ไม่มีตัวอย่าง</span>
						</div>
					)}
				</div>

				<div className="mb-4 space-y-2">
					<h3 className="truncate font-medium text-foreground">{file.name}</h3>

					<div className="space-y-1.5 text-xs text-muted-foreground">
						<DetailRow label="ชนิด" value={fileTypeLabel(file.type)} />
						<DetailRow label="ขนาด" value={file.size} />
						<DetailRow label="จาก" value={file.source} />
						<DetailRow label="รับเมื่อ" value={file.receivedAt} />

						<div className="flex justify-between gap-4">
							<span>ตำแหน่ง</span>
							<span className="max-w-[170px] truncate text-right text-foreground">{file.localPath}</span>
						</div>
					</div>
				</div>

				<div className="space-y-2">
					<Button className="w-full rounded-full" size="sm">
						<LuExternalLink />
						เปิด
					</Button>

					<div className="grid grid-cols-2 gap-2">
						<Button variant="outline" size="sm" className="rounded-full">
							<LuFolderOpen className="size-3.5" />
							เปิดในโฟลเดอร์
						</Button>

						<Button variant="outline" size="sm" className="rounded-full">
							<LuSend className="size-3.5" />
							ส่งต่อ
						</Button>
					</div>
				</div>

				<button
					type="button"
					className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
				>
					<LuHistory className="size-3.5" />
					ดูในประวัติ
				</button>
			</div>
		</aside>
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

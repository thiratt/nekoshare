import {
	LuCircleCheck,
	LuCircleX,
	LuClock,
	LuFile,
	LuFileArchive,
	LuFileImage,
	LuFileText,
	LuFileVideo,
} from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";

import type { HomeActiveTransferItem, HomeRecentTransferItem } from "../types";

const activeStatusLabel: Record<HomeActiveTransferItem["status"], string> = {
	cancelled: "ยกเลิกแล้ว",
	completed: "เสร็จแล้ว",
	connecting: "กำลังเชื่อมต่อ",
	failed: "ล้มเหลว",
	transferring: "กำลังโอน",
};

const recentStatusLabel: Record<HomeRecentTransferItem["status"], string> = {
	cancelled: "ยกเลิกแล้ว",
	completed: "เสร็จแล้ว",
	failed: "ล้มเหลว",
};

function clampProgress(value: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, Math.round(value)));
}

function formatBytes(value: number) {
	if (!Number.isFinite(value) || value <= 0) return "0 B";

	const units = ["B", "KB", "MB", "GB"] as const;
	let size = value;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	const digits = size >= 100 || unitIndex === 0 ? 0 : size >= 10 ? 1 : 2;
	return `${size.toFixed(digits)} ${units[unitIndex]}`;
}

function formatRelativeTime(timestamp: number) {
	const elapsedMs = Date.now() - timestamp;
	if (!Number.isFinite(elapsedMs) || elapsedMs < 60_000) return "เมื่อสักครู่";

	const minutes = Math.floor(elapsedMs / 60_000);
	if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} ชม. ที่แล้ว`;

	const days = Math.floor(hours / 24);
	return days === 1 ? "เมื่อวาน" : `${days} วันที่แล้ว`;
}

function fileIconFor(name: string) {
	const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() : undefined;
	if (!extension) return LuFile;
	if (["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(extension)) return LuFileImage;
	if (["mp4", "mov", "mkv", "webm", "avi"].includes(extension)) return LuFileVideo;
	if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return LuFileArchive;
	if (["pdf", "txt", "md", "doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension)) return LuFileText;
	return LuFile;
}

function activeTransferStatusLabel(direction: "send" | "receive", status: HomeActiveTransferItem["status"]) {
	if (status !== "transferring") return activeStatusLabel[status];
	return direction === "receive" ? "กำลังรับ" : "กำลังส่ง";
}

export function HomeTransfers({ transfers }: { transfers: HomeActiveTransferItem[] }) {
	return (
		<section className="w-full">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-sm font-medium text-muted-foreground">กำลังทำงาน</h2>
			</div>

			<div className="space-y-2">
				{transfers.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground">
						ยังไม่มีไฟล์ที่กำลังโอน
					</div>
				) : null}

				{transfers.map((transfer) => {
					const Icon = fileIconFor(transfer.fileName);
					const progress = clampProgress(transfer.progress);
					const statusText = activeTransferStatusLabel(transfer.direction, transfer.status);
					const sizeText = `${formatBytes(transfer.transferredBytes)} / ${formatBytes(transfer.totalBytes)}`;

					return (
						<div
							key={transfer.id}
							className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/30"
						>
							<Icon className="size-4 shrink-0 text-muted-foreground" />

							<div className="flex min-w-0 flex-1 flex-col gap-1.5">
								<div className="flex items-center gap-2 text-sm">
									<span className="truncate font-medium text-foreground">{transfer.fileName}</span>
									{transfer.peerName ? (
										<>
											<span className="text-muted-foreground">-&gt;</span>
											<span className="max-w-28 truncate text-muted-foreground">
												{transfer.peerName}
											</span>
										</>
									) : null}

									<span className="ml-auto text-xs text-muted-foreground">
										{transfer.status === "failed" ? statusText : `${progress}%`}
									</span>
								</div>

								<Progress value={progress} />
								<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
									<span>{statusText}</span>
									<span className="shrink-0 truncate">{transfer.errorMessage ?? sizeText}</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export function HomeRecentItems({
	isLoading,
	items,
	onViewAll,
}: {
	isLoading: boolean;
	items: HomeRecentTransferItem[];
	onViewAll?: () => void;
}) {
	return (
		<section className="w-full">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-sm font-medium text-muted-foreground">ล่าสุด</h2>

				{onViewAll ? (
					<Button type="button" size="sm" variant="ghost" onClick={onViewAll}>
						ดูทั้งหมด
					</Button>
				) : null}
			</div>

			<div className="flex flex-wrap items-center gap-3">
				{isLoading && items.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground">
						กำลังโหลดประวัติ
					</div>
				) : null}

				{!isLoading && items.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border bg-card/60 px-4 py-2 text-sm text-muted-foreground">
						ยังไม่มีประวัติการโอน
					</div>
				) : null}

				{items.map((item) => {
					const Icon = fileIconFor(item.fileName);
					const StatusIcon = item.status === "failed" ? LuCircleX : LuCircleCheck;
					const statusText = recentStatusLabel[item.status];

					return (
						<Button key={item.id} type="button" variant="outline">
							<Icon className="size-3.5 shrink-0 text-muted-foreground" />
							<span className="max-w-24 truncate text-foreground">{item.fileName}</span>
							<StatusIcon className="size-3 shrink-0 text-muted-foreground" />
							<span className="shrink-0 text-xs text-muted-foreground">{statusText}</span>
							<LuClock className="size-3 shrink-0 text-muted-foreground" />
							<span className="shrink-0 text-xs text-muted-foreground">
								{formatRelativeTime(item.updatedAt)}
							</span>
						</Button>
					);
				})}
			</div>
		</section>
	);
}

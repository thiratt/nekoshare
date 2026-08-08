import React from "react";

import { LuArrowDownLeft, LuArrowUpRight, LuCircleCheck, LuCircleX, LuClock3, LuFile, LuPause } from "react-icons/lu";

import { cn } from "@workspace/ui/lib/utils";

import { formatBytes, formatRelativeTime, isActiveTransfer } from "../utils/transfer-utils";
import type { TransferDirection, TransferItem } from "../types";

export function HomeTransferList({
	transfers,
	selectedId,
	onSelect,
}: {
	transfers: TransferItem[];
	selectedId: string | null;
	onSelect: (id: string) => void;
}) {
	return (
		<div className="min-w-[900px]">
			<div
				className={cn(
					"sticky top-0 z-10 grid h-8",
					"grid-cols-[minmax(260px,1fr)_120px_170px_200px_100px_120px]",
					"items-center border-b bg-background/95 px-3",
					"text-[11px] text-muted-foreground backdrop-blur",
				)}
			>
				<span>Name</span>
				<span>Direction</span>
				<span>With</span>
				<span>Status</span>
				<span>Size</span>
				<span>Updated</span>
			</div>

			<div className="p-1.5">
				{transfers.map((transfer) => (
					<HomeTransferRow
						key={transfer.id}
						transfer={transfer}
						selected={transfer.id === selectedId}
						onSelect={() => onSelect(transfer.id)}
					/>
				))}
			</div>
		</div>
	);
}

function HomeTransferRow({
	transfer,
	selected,
	onSelect,
}: {
	transfer: TransferItem;
	selected: boolean;
	onSelect: () => void;
}) {
	const active = isActiveTransfer(transfer);

	return (
		<button
			type="button"
			className={cn(
				"grid min-h-12 w-full",
				"grid-cols-[minmax(260px,1fr)_120px_170px_200px_100px_120px]",
				"items-center rounded-md px-2 text-left outline-none",
				"transition-[background-color,box-shadow] duration-150",
				"hover:bg-accent/60",
				"focus-visible:ring-2 focus-visible:ring-ring",
				selected && "bg-accent text-accent-foreground",
			)}
			onClick={onSelect}
		>
			<div className="flex min-w-0 items-center gap-2.5">
				<div className="grid size-8 shrink-0 place-items-center rounded-md border bg-background">
					<LuFile className="size-3.5 text-muted-foreground" />
				</div>

				<div className="min-w-0">
					<p className="truncate text-xs font-medium">{transfer.name}</p>

					<p className="mt-0.5 truncate text-[11px] text-muted-foreground">
						{transfer.fileCount === 1 ? "1 file" : `${transfer.fileCount} files`}
					</p>
				</div>
			</div>

			<HomeDirectionLabel direction={transfer.direction} />

			<span className="truncate pr-4 text-xs text-muted-foreground">{transfer.peerName}</span>

			<div className="min-w-0 pr-5">
				<HomeTransferStatusLabel transfer={transfer} />

				{active && (
					<div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-foreground transition-[width]"
							style={{ width: `${transfer.progress}%` }}
						/>
					</div>
				)}
			</div>

			<span className="text-xs text-muted-foreground">{formatBytes(transfer.totalBytes)}</span>

			<span className="truncate text-xs text-muted-foreground">{formatRelativeTime(transfer.updatedAt)}</span>
		</button>
	);
}

function HomeDirectionLabel({ direction }: { direction: TransferDirection }) {
	const outgoing = direction === "outgoing";

	return (
		<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
			{outgoing ? <LuArrowUpRight className="size-3.5" /> : <LuArrowDownLeft className="size-3.5" />}

			{outgoing ? "Sent" : "Received"}
		</span>
	);
}

function HomeTransferStatusLabel({ transfer }: { transfer: TransferItem }) {
	switch (transfer.status) {
		case "connecting":
			return <HomeStatusText icon={LuClock3} label="Connecting" detail={`${transfer.progress}%`} />;

		case "transferring":
			return (
				<HomeStatusText
					icon={transfer.direction === "outgoing" ? LuArrowUpRight : LuArrowDownLeft}
					label={`${transfer.progress}%`}
					detail={transfer.speedBytesPerSecond ? `${formatBytes(transfer.speedBytesPerSecond)}/s` : undefined}
				/>
			);

		case "paused":
			return <HomeStatusText icon={LuPause} label="Paused" detail={`${transfer.progress}%`} />;

		case "verifying":
			return <HomeStatusText icon={LuClock3} label="Verifying" />;

		case "completed":
			return <HomeStatusText icon={LuCircleCheck} label="Completed" />;

		case "failed":
			return <HomeStatusText icon={LuCircleX} label="Failed" />;
	}
}

function HomeStatusText({
	icon: Icon,
	label,
	detail,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	detail?: string;
}) {
	return (
		<div className="flex min-w-0 items-center gap-1.5 text-xs">
			<Icon className="size-3.5 shrink-0 text-muted-foreground" />

			<span className="truncate">{label}</span>

			{detail && (
				<>
					<span className="text-muted-foreground">·</span>
					<span className="truncate text-muted-foreground">{detail}</span>
				</>
			)}
		</div>
	);
}

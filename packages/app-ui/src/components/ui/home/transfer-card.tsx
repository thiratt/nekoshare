import { memo } from "react";

import {
	LuCheckCheck,
	LuFileArchive,
	LuFolder,
	LuGlobe,
	LuLoader,
	LuPause,
	LuPlay,
	LuServer,
	LuShieldCheck,
	LuTriangleAlert,
	LuWifi,
	LuX,
} from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { cn } from "@workspace/ui/lib/utils";

export type TransferPath = "lan" | "relay" | "websocket" | "unknown";

export type TransferState =
	| "connecting"
	| "listening"
	| "handshaking"
	| "transferring"
	| "paused"
	| "recovering"
	| "verifying"
	| "completed"
	| "failed"
	| "cancelled";

export type ActiveTransfer = {
	id: string;
	name: string;
	fileCount?: number;
	isFolder?: boolean;

	direction: "send" | "receive";
	peerName: string;
	deviceName?: string;

	path: TransferPath;
	encrypted: boolean;
	state: TransferState;

	transferredBytes: number;
	totalBytes: number;
	speedBps?: number;
	etaSeconds?: number;

	errorMessage?: string;
};

type ActiveTransferCardProps = {
	selected?: boolean;
	transfer: ActiveTransfer;
	onPause?: (id: string) => void;
	onResume?: (id: string) => void;
	onCancel?: (id: string) => void;
	onShowDetails?: (id: string) => void;
	onSelected?: (event: React.MouseEvent<HTMLDivElement>) => void;
	onContextSelected?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

const GB = 1024 ** 3;
const MB = 1024 ** 2;

export const mockActiveTransfers: ActiveTransfer[] = [
	{
		id: "tr_001",
		name: "rdr2-thai-translation-pack.zip",
		fileCount: 249,
		isFolder: true,
		direction: "send",
		peerName: "Max Android",
		deviceName: "Galaxy A55",
		path: "lan",
		encrypted: true,
		state: "transferring",
		transferredBytes: 2.8 * GB,
		totalBytes: 8.1 * GB,
		speedBps: 112 * MB,
		etaSeconds: 48,
	},
	{
		id: "tr_002",
		name: "graduation-project-demo.mov",
		fileCount: 1,
		isFolder: false,
		direction: "receive",
		peerName: "Office PC",
		deviceName: "Windows Desktop",
		path: "relay",
		encrypted: true,
		state: "transferring",
		transferredBytes: 640 * MB,
		totalBytes: 4.7 * GB,
		speedBps: 18 * MB,
		etaSeconds: 236,
	},
	{
		id: "tr_003",
		name: "client-assets",
		fileCount: 1284,
		isFolder: true,
		direction: "send",
		peerName: "Web Session",
		deviceName: "Chrome",
		path: "websocket",
		encrypted: true,
		state: "recovering",
		transferredBytes: 1.2 * GB,
		totalBytes: 5 * GB,
		speedBps: 0,
		etaSeconds: undefined,
	},
	{
		id: "tr_004",
		name: "backup-photos.zip",
		fileCount: 1,
		isFolder: false,
		direction: "receive",
		peerName: "Max Laptop",
		deviceName: "Nekoshare Desktop",
		path: "lan",
		encrypted: false,
		state: "paused",
		transferredBytes: 820 * MB,
		totalBytes: 2.4 * GB,
		speedBps: 0,
		etaSeconds: undefined,
	},
	{
		id: "tr_005",
		name: "final-build.tar.zst",
		fileCount: 1,
		isFolder: false,
		direction: "send",
		peerName: "Dev Server",
		deviceName: "Ubuntu VPS",
		path: "relay",
		encrypted: true,
		state: "verifying",
		transferredBytes: 1.6 * GB,
		totalBytes: 1.6 * GB,
		speedBps: 0,
		etaSeconds: 0,
	},
	{
		id: "tr_006",
		name: "video-cache",
		fileCount: 84,
		isFolder: true,
		direction: "send",
		peerName: "Friend PC",
		deviceName: "Windows",
		path: "unknown",
		encrypted: true,
		state: "failed",
		transferredBytes: 312 * MB,
		totalBytes: 3.2 * GB,
		speedBps: 0,
		etaSeconds: undefined,
		errorMessage: "Connection lost. The receiver went offline before resume data was saved.",
	},
];

export const ActiveTransferCard = memo(function ActiveTransferCard({
	selected,
	transfer,
	onPause,
	onResume,
	onCancel,
	onShowDetails,
	onSelected,
	onContextSelected,
}: ActiveTransferCardProps) {
	const progress =
		transfer.totalBytes > 0
			? Math.min(100, Math.max(0, (transfer.transferredBytes / transfer.totalBytes) * 100))
			: 0;

	const isDone = transfer.state === "completed";
	const isFailed = transfer.state === "failed";
	const isPaused = transfer.state === "paused";
	const isBusy =
		transfer.state === "connecting" ||
		transfer.state === "listening" ||
		transfer.state === "handshaking" ||
		transfer.state === "recovering" ||
		transfer.state === "verifying";

	const peerText = transfer.direction === "send" ? `To ${transfer.peerName}` : `From ${transfer.peerName}`;

	return (
		<div
			className={cn(
				"group rounded-2xl border bg-card p-4 shadow-sm transition-colors",
				isFailed && "border-destructive/40",
				selected ? "bg-primary/10 border-primary/70" : "hover:bg-muted/50",
			)}
			onClick={(event) => {
				event.stopPropagation();
				onSelected?.(event);
			}}
			onContextMenu={(event) => {
				onContextSelected?.(event);
			}}
			onDoubleClick={() => {
				if (!isBusy) {
					onShowDetails?.(transfer.id);
				}
			}}
		>
			<div className="flex items-start gap-3">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-muted/50">
					{transfer.isFolder ? (
						<LuFolder className="h-5 w-5 text-muted-foreground" />
					) : (
						<LuFileArchive className="h-5 w-5 text-muted-foreground" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-start justify-between gap-3">
						<div className="min-w-0">
							<div className="w-fit truncate text-foreground underline underline-offset-8 transition-all hover:underline hover:underline-offset-2 hover:cursor-pointer">
								{transfer.name}
							</div>

							<div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
								<span className="truncate">{peerText}</span>

								{transfer.deviceName ? (
									<>
										<span>·</span>
										<span className="truncate">{transfer.deviceName}</span>
									</>
								) : null}

								{transfer.fileCount && transfer.fileCount > 1 ? (
									<>
										<span>·</span>
										<span>{transfer.fileCount} files</span>
									</>
								) : null}
							</div>
						</div>

						<div className="shrink-0 text-right">
							<div className="text-sm font-medium tabular-nums">{Math.round(progress)}%</div>
							<div className="mt-0.5 text-xs text-muted-foreground">
								{formatBytes(transfer.totalBytes)}
							</div>
						</div>
					</div>

					<div className="mt-3 flex flex-wrap items-center gap-1">
						<StateBadge state={transfer.state} />
						<PathBadge path={transfer.path} />
						<EncryptionBadge encrypted={transfer.encrypted} />
					</div>

					<div className="mt-3 flex gap-3 items-center">
						<div className="flex-1">
							<Progress value={progress} className={cn(isFailed && "bg-destructive/30")} />

							<div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
								<span className="truncate tabular-nums">
									{formatBytes(transfer.transferredBytes)} / {formatBytes(transfer.totalBytes)}
								</span>

								<span className="shrink-0 tabular-nums">
									{isBusy ? (
										stateText(transfer.state)
									) : transfer.speedBps && transfer.state === "transferring" ? (
										<>
											{formatBytes(transfer.speedBps)}/s
											{typeof transfer.etaSeconds === "number"
												? ` · ${formatEta(transfer.etaSeconds)} left`
												: null}
										</>
									) : (
										stateText(transfer.state)
									)}
								</span>
							</div>
						</div>

						<div className="space-x-1">
							{isPaused ? (
								<Button
									size="icon"
									variant="outline"
									onClick={(e) => {
										e.stopPropagation();
										onResume?.(transfer.id);
									}}
								>
									<LuPlay />
								</Button>
							) : transfer.state === "transferring" || transfer.state === "recovering" ? (
								<Button
									size="icon"
									variant="outline"
									onClick={(e) => {
										e.stopPropagation();
										onPause?.(transfer.id);
									}}
								>
									<LuPause />
								</Button>
							) : null}
							{!isDone && transfer.state !== "cancelled" ? (
								<Button
									size="icon"
									variant="destructive"
									onClick={(e) => {
										e.stopPropagation();
										onCancel?.(transfer.id);
									}}
								>
									<LuX />
								</Button>
							) : null}
						</div>
					</div>

					{transfer.errorMessage ? (
						<div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
							<LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<span>{transfer.errorMessage}</span>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
});

function StateBadge({ state }: { state: TransferState }) {
	const icon =
		state === "completed" ? (
			<LuCheckCheck />
		) : state === "failed" ? (
			<LuTriangleAlert />
		) : state === "transferring" ? (
			<LuLoader className="h-3 w-3 animate-spin" />
		) : state === "recovering" || state === "connecting" || state === "handshaking" ? (
			<LuLoader className="h-3 w-3 animate-spin" />
		) : null;

	return (
		<span
			className={cn(
				"flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs",
				state === "failed" && "border-destructive/30 text-destructive",
				state === "completed" && "text-foreground",
				state !== "failed" && state !== "completed" && "text-muted-foreground",
			)}
		>
			{icon}
			{stateText(state)}
		</span>
	);
}

function PathBadge({ path }: { path: TransferPath }) {
	const meta = {
		lan: {
			label: "LAN Direct",
			icon: LuWifi,
		},
		relay: {
			label: "Relay",
			icon: LuServer,
		},
		websocket: {
			label: "WebSocket",
			icon: LuGlobe,
		},
		unknown: {
			label: "Finding path",
			icon: LuLoader,
		},
	} satisfies Record<TransferPath, { label: string; icon: typeof LuWifi }>;

	const Icon = meta[path].icon;

	return (
		<span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
			<Icon className={cn("h-3 w-3", path === "unknown" && "animate-spin")} />
			{meta[path].label}
		</span>
	);
}

function EncryptionBadge({ encrypted }: { encrypted: boolean }) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
				encrypted ? "text-muted-foreground" : "border-destructive/30 text-destructive",
			)}
		>
			{encrypted ? (
				<>
					<LuShieldCheck />
					Encrypted
				</>
			) : (
				<>
					<LuTriangleAlert />
					Encryption Off
				</>
			)}
		</span>
	);
}

function stateText(state: TransferState) {
	switch (state) {
		case "connecting":
			return "Connecting";
		case "listening":
			return "Opening receiver";
		case "handshaking":
			return "Securing";
		case "transferring":
			return "Transferring";
		case "paused":
			return "Paused";
		case "recovering":
			return "Recovering";
		case "verifying":
			return "Verifying";
		case "completed":
			return "Completed";
		case "failed":
			return "Failed";
		case "cancelled":
			return "Cancelled";
	}
}

function formatBytes(bytes: number) {
	if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
	return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

function formatEta(seconds: number) {
	if (!Number.isFinite(seconds) || seconds < 0) return "â€”";

	if (seconds < 60) return `${Math.ceil(seconds)}s`;

	const minutes = Math.floor(seconds / 60);
	const restSeconds = Math.ceil(seconds % 60);

	if (minutes < 60) return `${minutes}m ${restSeconds}s`;

	const hours = Math.floor(minutes / 60);
	const restMinutes = minutes % 60;

	return `${hours}h ${restMinutes}m`;
}

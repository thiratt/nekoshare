import { memo } from "react";

import {
	LuCheckCheck,
	LuFileArchive,
	LuFolder,
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

import { AppLink } from "@workspace/app-ui/components/app-link";

import {
	type ActiveTransferTargetView,
	type ActiveTransferView,
	getTransferProgress,
	type TransferConnectionState,
	type TransferDeliveryState,
	type TransferRouteType,
} from "../../transfer-model";

type ActiveTransferCardProps = {
	selected?: boolean;
	transfer: ActiveTransferView;
	onPause?: (id: string) => void;
	onResume?: (id: string) => void;
	onCancel?: (id: string) => void;
	onShowDetails?: (id: string) => void;
	detailsHref?: string;
	onSelected?: (event: React.MouseEvent<HTMLDivElement>) => void;
	onContextSelected?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export const ActiveTransferCard = memo(function ActiveTransferCard({
	selected,
	transfer,
	onPause,
	onResume,
	onCancel,
	onShowDetails,
	detailsHref,
	onSelected,
	onContextSelected,
}: ActiveTransferCardProps) {
	const progress = getTransferProgress(transfer);
	const isDone = transfer.state === "completed";
	const isFailed = transfer.state === "failed";
	const isPaused = transfer.state === "paused";
	const isBusy = transfer.state === "queued" || transfer.state === "verifying" || transfer.targets.some(isBusyTarget);
	const targetText = formatTargetSummary(transfer);
	const deviceText = formatDeviceSummary(transfer.targets);
	const primaryRoute = getPrimaryRoute(transfer);

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
					{transfer.kind === "folder" ? (
						<LuFolder className="h-5 w-5 text-muted-foreground" />
					) : (
						<LuFileArchive className="h-5 w-5 text-muted-foreground" />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-start justify-between gap-3">
						<div className="min-w-0">
							{detailsHref ? (
								<AppLink
									href={detailsHref}
									className="block w-fit max-w-full truncate text-foreground underline underline-offset-8 transition-all hover:cursor-pointer hover:underline hover:underline-offset-2"
									onClick={(event) => {
										event.stopPropagation();
									}}
								>
									{transfer.title}
								</AppLink>
							) : (
								<button
									type="button"
									className="block w-fit max-w-full truncate text-left text-foreground underline underline-offset-8 transition-all hover:cursor-pointer hover:underline hover:underline-offset-2"
									onClick={(event) => {
										event.stopPropagation();
										onShowDetails?.(transfer.id);
									}}
								>
									{transfer.title}
								</button>
							)}

							<div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
								<span className="truncate">{targetText}</span>

								{deviceText ? (
									<>
										<span>·</span>
										<span className="truncate">{deviceText}</span>
									</>
								) : null}

								{transfer.fileCount > 1 ? (
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
						<StateBadge state={transfer.state} connectionState={primaryRoute.connectionState} />
						<PathBadge routeType={primaryRoute.type} />
						<span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
							{primaryRoute.type} · {primaryRoute.protocol}
						</span>
						<EncryptionBadge encrypted={transfer.encrypted} />
					</div>

					<div className="mt-3 flex items-center gap-3">
						<div className="flex-1">
							<Progress value={progress} className={cn(isFailed && "bg-destructive/30")} />

							<div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
								<span className="truncate tabular-nums">
									{formatBytes(transfer.transferredBytes)} / {formatBytes(transfer.totalBytes)}
								</span>

								<span className="shrink-0 tabular-nums">
									{isBusy ? (
										stateText(transfer.state, primaryRoute.connectionState)
									) : transfer.speedBps && transfer.state === "transferring" ? (
										<>
											{formatBytes(transfer.speedBps)}/s
											{typeof transfer.etaSeconds === "number"
												? ` · ${formatEta(transfer.etaSeconds)} left`
												: null}
										</>
									) : (
										stateText(transfer.state, primaryRoute.connectionState)
									)}
								</span>
							</div>
						</div>

						<div className="space-x-1">
							{isPaused && onResume ? (
								<Button
									type="button"
									size="icon"
									variant="outline"
									title="ดำเนินการต่อ"
									onClick={(event) => {
										event.stopPropagation();
										onResume?.(transfer.id);
									}}
								>
									<LuPlay />
								</Button>
							) : transfer.state === "transferring" && onPause ? (
								<Button
									type="button"
									size="icon"
									variant="outline"
									title="หยุดชั่วคราว"
									onClick={(event) => {
										event.stopPropagation();
										onPause?.(transfer.id);
									}}
								>
									<LuPause />
								</Button>
							) : null}
							{onCancel && !isDone && transfer.state !== "failed" && transfer.state !== "cancelled" ? (
								<Button
									type="button"
									size="icon"
									variant="destructive"
									title="ยกเลิก"
									onClick={(event) => {
										event.stopPropagation();
										onCancel?.(transfer.id);
									}}
								>
									<LuX />
								</Button>
							) : null}
						</div>
					</div>

					{transfer.error ? (
						<div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
							<LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
							<span>{transfer.error.message}</span>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
});

function isBusyTarget(target: ActiveTransferTargetView) {
	return (
		target.connectionState === "connecting" ||
		target.connectionState === "listening" ||
		target.connectionState === "handshaking" ||
		target.connectionState === "recovering"
	);
}

function formatTargetSummary(transfer: ActiveTransferView) {
	const prefix = transfer.direction === "send" ? "To" : "From";
	const names = transfer.targets.map((target) => target.name);
	if (names.length === 0) return `${prefix} unknown`;
	if (names.length === 1) return `${prefix} ${names[0]}`;
	return `${prefix} ${names[0]} + ${names.length - 1} more`;
}

function formatDeviceSummary(targets: ActiveTransferTargetView[]) {
	const devices = targets.map((target) => target.deviceName).filter(Boolean);
	if (devices.length === 0) return null;
	if (devices.length === 1) return devices[0];
	return `${devices.length} devices`;
}

function getPrimaryRoute(transfer: ActiveTransferView) {
	const target = transfer.targets.find((item) => item.state === "transferring") ?? transfer.targets[0];
	return {
		type: target?.route.type ?? "unknown",
		protocol: target?.route.protocol ?? "unknown",
		connectionState: target?.connectionState ?? "idle",
	};
}

function StateBadge({
	state,
	connectionState,
}: {
	state: TransferDeliveryState;
	connectionState: TransferConnectionState;
}) {
	const icon =
		state === "completed" ? (
			<LuCheckCheck />
		) : state === "failed" ? (
			<LuTriangleAlert />
		) : state === "transferring" ? (
			<LuLoader className="h-3 w-3 animate-spin" />
		) : state === "queued" ||
		  state === "verifying" ||
		  connectionState === "connecting" ||
		  connectionState === "handshaking" ||
		  connectionState === "recovering" ? (
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
			{stateText(state, connectionState)}
		</span>
	);
}

function PathBadge({ routeType }: { routeType: TransferRouteType }) {
	const meta = {
		lan: {
			label: "LAN Direct",
			icon: LuWifi,
		},
		direct: {
			label: "Direct",
			icon: LuWifi,
		},
		relay: {
			label: "Relay",
			icon: LuServer,
		},
		unknown: {
			label: "Finding path",
			icon: LuLoader,
		},
	} satisfies Record<TransferRouteType, { label: string; icon: typeof LuWifi }>;

	const Icon = meta[routeType].icon;

	return (
		<span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">
			<Icon className={cn("h-3 w-3", routeType === "unknown" && "animate-spin")} />
			{meta[routeType].label}
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

function stateText(state: TransferDeliveryState, connectionState: TransferConnectionState) {
	if (state === "queued") {
		if (connectionState === "listening") return "Opening receiver";
		if (connectionState === "connecting") return "Connecting";
		if (connectionState === "handshaking") return "Securing";
		return "Queued";
	}

	if (connectionState === "recovering" && state === "transferring") return "Recovering";

	switch (state) {
		case "transferring":
			return "Transferring";
		case "paused":
			return "Paused";
		case "verifying":
			return "Verifying";
		case "completed":
			return "Completed";
		case "failed":
			return "Failed";
		case "cancelled":
			return "Cancelled";
		case "skipped":
			return "Skipped";
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
	if (!Number.isFinite(seconds) || seconds < 0) return "-";

	if (seconds < 60) return `${Math.ceil(seconds)}s`;

	const minutes = Math.floor(seconds / 60);
	const restSeconds = Math.ceil(seconds % 60);

	if (minutes < 60) return `${minutes}m ${restSeconds}s`;

	const hours = Math.floor(minutes / 60);
	const restMinutes = minutes % 60;

	return `${hours}h ${restMinutes}m`;
}

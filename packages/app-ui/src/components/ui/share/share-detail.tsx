import { useMemo, useState } from "react";

import {
	LuArrowLeft,
	LuCircleAlert,
	LuCircleCheck,
	LuCopy,
	LuFile,
	LuFolderOpen,
	LuInfo,
	LuLock,
	LuPause,
	LuPlay,
	LuRefreshCcw,
	LuSend,
	LuX,
} from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";

import {
	DetailPanel,
	DetailPanelContent,
	DetailPanelProvider,
	DetailPanelTrigger,
} from "@workspace/app-ui/components/detail-panel";
import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { ExtendLink } from "@workspace/app-ui/components/ext/link";
import type { IncludeLinkComponentProps } from "@workspace/app-ui/types/link";

import { formatFileSize } from "../drop-overlay";
import type { TransferDeliveryState, TransferDirection, TransferProtocol, TransferRouteType } from "../transfer-model";

export type ShareDetailConnectionState = "connecting" | "handshaking" | "recovering" | "disconnected";
export type ShareDetailState = TransferDeliveryState | ShareDetailConnectionState | "sending";
export type ShareDetailStatus = ShareDetailState;
export type ShareDetailFileStatus = TransferDeliveryState | "sending";

export type ShareDetailActions = {
	canPause?: boolean;
	canResume?: boolean;
	canCancel?: boolean;
	canRetry?: boolean;
	canOpenFolder?: boolean;
};

export type ShareDetailRoute = {
	type: TransferRouteType;
	protocol: TransferProtocol;
};

export type ShareDetailFile = {
	id: string;
	name: string;
	size: number;
	transferredBytes: number;
	progress: number;
	status: ShareDetailFileStatus;
	error?: string | null;
	actions?: ShareDetailActions;
};

export type ShareDetailRecipient = {
	id: string;
	name: string;
	description?: string | null;
	status?: ShareDetailStatus;
	state?: ShareDetailState;
	route?: ShareDetailRoute;
	files: ShareDetailFile[];
	actions?: ShareDetailActions;
};

export type ShareDetailData = {
	id: string;
	title: string;
	subtitle: string;
	direction: TransferDirection;
	status?: ShareDetailStatus;
	state: ShareDetailState;
	stateLabel?: string;
	pathLabel?: string;
	progress: number;
	totalBytes: number;
	transferredBytes: number;
	encrypted: boolean | null;
	actions?: ShareDetailActions;
	startedAt?: Date | null;
	updatedAt?: Date | null;
	recipients: ShareDetailRecipient[];
};

export type ShareDetailUIProps = IncludeLinkComponentProps & {
	data: ShareDetailData | null;
	backHref: string;
	onCopyId?: (id: string) => void;
	onOpenFolder?: () => void;
	onPause?: () => void;
	onResume?: () => void;
	onRetry?: () => void;
	onCancel?: () => void;
	onPauseRecipient?: (recipientId: string) => void;
	onResumeRecipient?: (recipientId: string) => void;
	onRetryRecipient?: (recipientId: string) => void;
	onCancelRecipient?: (recipientId: string) => void;
	onPauseFile?: (recipientId: string, fileId: string) => void;
	onResumeFile?: (recipientId: string, fileId: string) => void;
	onRetryFile?: (recipientId: string, fileId: string) => void;
	onCancelFile?: (recipientId: string, fileId: string) => void;
};

type AvailableActions = {
	canPause: boolean;
	canResume: boolean;
	canRetry: boolean;
	canCancel: boolean;
	canOpenFolder: boolean;
};

type ActionScope = "session" | "recipient" | "file";
type PrimaryAction = "pause" | "resume" | "retry" | null;

function normalizeDeliveryState(state?: ShareDetailState | ShareDetailFileStatus | null): TransferDeliveryState {
	switch (state) {
		case "sending":
			return "transferring";
		case "connecting":
		case "handshaking":
			return "queued";
		case "recovering":
			return "transferring";
		case "disconnected":
			return "failed";
		case "queued":
		case "transferring":
		case "paused":
		case "verifying":
		case "completed":
		case "failed":
		case "cancelled":
		case "skipped":
			return state;
		default:
			return "queued";
	}
}

function getDeliveryLabel(state: ShareDetailState | ShareDetailFileStatus, direction?: TransferDirection) {
	switch (state) {
		case "connecting":
			return "กำลังเชื่อมต่อ";
		case "handshaking":
			return "กำลังยืนยันปลายทาง";
		case "recovering":
			return "กำลังกู้การเชื่อมต่อ";
		case "disconnected":
			return "หลุดการเชื่อมต่อ";
	}

	switch (normalizeDeliveryState(state)) {
		case "queued":
			return "รอคิว";
		case "transferring":
			return direction === "receive" ? "กำลังรับ" : "กำลังส่ง";
		case "paused":
			return "หยุดอยู่";
		case "verifying":
			return "กำลังตรวจสอบ";
		case "completed":
			return "เสร็จแล้ว";
		case "failed":
			return "ล้มเหลว";
		case "cancelled":
			return "ยกเลิกแล้ว";
		case "skipped":
			return "ข้ามแล้ว";
	}
}

function getDeliveryBadgeConfig(state: ShareDetailState | ShareDetailFileStatus, direction?: TransferDirection) {
	const normalized = normalizeDeliveryState(state);
	const active = normalized === "queued" || normalized === "transferring" || normalized === "verifying";

	return {
		label: getDeliveryLabel(state, direction),
		icon:
			normalized === "completed"
				? LuCircleCheck
				: normalized === "failed"
					? LuCircleAlert
					: normalized === "paused"
						? LuPause
						: normalized === "cancelled" || normalized === "skipped"
							? LuX
							: LuSend,
		badgeClassName: cn(
			normalized === "completed" &&
				"border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
			normalized === "failed" && "border-destructive/20 bg-destructive/10 text-destructive",
			normalized === "paused" && "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
			(normalized === "cancelled" || normalized === "skipped") && "text-muted-foreground",
			active && "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
		),
		active,
	};
}

function getFileStatusLabel(state: ShareDetailFileStatus) {
	return getDeliveryLabel(state);
}

function resolveCapability(defaultAllowed: boolean, value: boolean | undefined, explicitOnly = false) {
	if (explicitOnly) return value === true;
	if (value === false) return false;
	return defaultAllowed;
}

function getAvailableActions({
	state,
	actions,
	scope,
}: {
	state: ShareDetailState | ShareDetailFileStatus;
	actions?: ShareDetailActions;
	scope: ActionScope;
}): AvailableActions {
	const normalized = normalizeDeliveryState(state);
	const canPause = normalized === "transferring" && resolveCapability(true, actions?.canPause);
	const canResume = normalized === "paused" && resolveCapability(true, actions?.canResume);
	const canRetry =
		(normalized === "failed" && resolveCapability(true, actions?.canRetry)) ||
		((normalized === "cancelled" || normalized === "skipped") && actions?.canRetry === true);
	const canCancel =
		normalized === "queued" || normalized === "transferring" || normalized === "paused" || normalized === "failed"
			? resolveCapability(true, actions?.canCancel)
			: normalized === "verifying"
				? actions?.canCancel === true
				: false;
	const canOpenFolder = scope === "session" && normalized === "completed" && actions?.canOpenFolder === true;

	return {
		canPause,
		canResume,
		canRetry,
		canCancel,
		canOpenFolder,
	};
}

function clampPercent(value: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}

function getAggregateDeliveryState(items: Array<{ state?: ShareDetailState; status?: ShareDetailFileStatus }>) {
	if (items.length === 0) return "queued" satisfies TransferDeliveryState;

	const states = items.map((item) => normalizeDeliveryState(item.state ?? item.status));
	if (states.every((state) => state === "completed" || state === "skipped")) return "completed";
	if (states.every((state) => state === "cancelled")) return "cancelled";
	if (states.some((state) => state === "transferring")) return "transferring";
	if (states.some((state) => state === "verifying")) return "verifying";
	if (states.some((state) => state === "paused")) return "paused";
	if (states.some((state) => state === "queued")) return "queued";
	if (states.some((state) => state === "failed")) return "failed";
	return "queued";
}

function getRecipientDisplayState(recipient: ShareDetailRecipient): TransferDeliveryState {
	if (recipient.files.length > 0) return getAggregateDeliveryState(recipient.files);
	if (recipient.state) return normalizeDeliveryState(recipient.state);
	return normalizeDeliveryState(recipient.status);
}

function getRecipientStats(recipient: ShareDetailRecipient) {
	const totalBytes = recipient.files.reduce((sum, file) => sum + file.size, 0);
	const transferredBytes = recipient.files.reduce(
		(sum, file) => sum + Math.max(0, Math.min(file.transferredBytes, file.size)),
		0,
	);
	const failedFiles = recipient.files.filter((file) => normalizeDeliveryState(file.status) === "failed").length;
	const completedFiles = recipient.files.filter((file) => normalizeDeliveryState(file.status) === "completed").length;
	const state = getRecipientDisplayState(recipient);
	const progress =
		state === "completed" ? 100 : totalBytes > 0 ? clampPercent((transferredBytes / totalBytes) * 100) : 0;

	return {
		totalBytes,
		transferredBytes,
		failedFiles,
		completedFiles,
		progress,
		state,
		hasPartialFailure: failedFiles > 0 && completedFiles > 0,
	};
}

function formatOptionalDate(value?: Date | null) {
	if (!value) return "—";
	return new Intl.DateTimeFormat("th-TH", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(value);
}

function formatRouteLabel(route?: ShareDetailRoute | null, fallback?: string | null) {
	if (route) {
		const typeLabel = {
			lan: "LAN",
			direct: "Direct",
			relay: "Relay",
			unknown: "—",
		} satisfies Record<TransferRouteType, string>;

		if (route.type === "unknown" && route.protocol === "unknown") return fallback ?? "—";
		return `${typeLabel[route.type]} · ${route.protocol}`;
	}

	return fallback?.trim() || "—";
}

function shouldShowDetailRow(value: string | number | null | undefined) {
	return value !== null && value !== undefined && value !== "";
}

function getPrimaryAction(actions: AvailableActions): PrimaryAction {
	if (actions.canPause) return "pause";
	if (actions.canResume) return "resume";
	if (actions.canRetry) return "retry";
	return null;
}

function ActionButton({
	action,
	onClick,
	size = "sm",
}: {
	action: Exclude<PrimaryAction, null> | "cancel" | "openFolder";
	onClick?: () => void;
	size?: "sm" | "icon";
}) {
	const config = {
		pause: { label: "หยุด", icon: LuPause, variant: "outline" as const },
		resume: { label: "ทำต่อ", icon: LuPlay, variant: "outline" as const },
		retry: {
			label: "ลองใหม่",
			icon: LuRefreshCcw,
			variant: "outline" as const,
		},
		cancel: { label: "ยกเลิก", icon: LuX, variant: "destructive" as const },
		openFolder: {
			label: "เปิดในโฟลเดอร์",
			icon: LuFolderOpen,
			variant: "outline" as const,
		},
	}[action];
	const Icon = config.icon;

	return (
		<Button variant={config.variant} size={size} onClick={onClick}>
			<Icon />
			{size === "icon" ? null : config.label}
		</Button>
	);
}

function StatusBadge({
	state,
	direction,
	label,
}: {
	state: ShareDetailState | ShareDetailFileStatus;
	direction?: TransferDirection;
	label?: string;
}) {
	const config = getDeliveryBadgeConfig(state, direction);
	const Icon = config.icon;

	return (
		<Badge variant="outline" className={cn("gap-1.5 rounded-full", config.badgeClassName)}>
			<Icon className={cn("size-3.5", config.active && "animate-pulse")} />
			{label ?? config.label}
		</Badge>
	);
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
	if (!shouldShowDetailRow(value)) return null;

	return (
		<div className="flex justify-between gap-4">
			<span className="text-muted-foreground">{label}</span>
			<span className="text-right">{value}</span>
		</div>
	);
}

function EmptyDetail({ linkComponent, backHref }: IncludeLinkComponentProps & { backHref: string }) {
	return (
		<CardTransition className="flex h-full flex-col" tag="share-detail-card">
			<div className="flex items-center gap-3 border-b px-6 py-4">
				<Button variant="outline" size="icon" asChild>
					<ExtendLink href={backHref} linkComponent={linkComponent} asButton>
						<LuArrowLeft />
					</ExtendLink>
				</Button>
				<div>
					<h1 className="text-lg font-semibold">ไม่พบรายละเอียดการแชร์</h1>
					<p className="text-sm text-muted-foreground">
						รายการนี้อาจถูกลบ หรือยังไม่มีข้อมูลประวัติในเครื่องนี้
					</p>
				</div>
			</div>
			<div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
				กลับไปหน้าแรกแล้วลองเลือกการแชร์รายการอื่น
			</div>
		</CardTransition>
	);
}

export function ShareDetailUI({
	data,
	backHref,
	linkComponent,
	onCopyId,
	onOpenFolder,
	onPause,
	onResume,
	onRetry,
	onCancel,
	onPauseRecipient,
	onResumeRecipient,
	onRetryRecipient,
	onCancelRecipient,
	onPauseFile,
	onResumeFile,
	onRetryFile,
}: ShareDetailUIProps) {
	const [selectedRecipientId, setSelectedRecipientId] = useState("");
	const [isDetailPanelOpen, setDetailPanelOpen] = useState(false);
	const selectedRecipient = useMemo(() => {
		if (!data) return null;
		return data.recipients.find((recipient) => recipient.id === selectedRecipientId) ?? data.recipients[0] ?? null;
	}, [data, selectedRecipientId]);

	if (!data) {
		return <EmptyDetail backHref={backHref} linkComponent={linkComponent} />;
	}

	const recipientStates = data.recipients.map((recipient) => ({
		state: getRecipientDisplayState(recipient),
	}));
	const sessionState =
		recipientStates.length > 0 ? getAggregateDeliveryState(recipientStates) : normalizeDeliveryState(data.state);
	const sessionActions = getAvailableActions({
		state: sessionState,
		actions: data.actions,
		scope: "session",
	});
	const recipientStats = data.recipients.map((recipient) => getRecipientStats(recipient));
	const totalFiles = data.recipients.reduce((sum, recipient) => sum + recipient.files.length, 0);
	const failedFiles = recipientStats.reduce((sum, stats) => sum + stats.failedFiles, 0);
	const completedFiles = recipientStats.reduce((sum, stats) => sum + stats.completedFiles, 0);
	const sessionTransferredBytes = recipientStats.reduce((sum, stats) => sum + stats.transferredBytes, 0);
	const sessionTotalBytes = recipientStats.reduce((sum, stats) => sum + stats.totalBytes, 0);
	const sessionProgress =
		sessionState === "completed"
			? 100
			: sessionTotalBytes > 0
				? clampPercent((sessionTransferredBytes / sessionTotalBytes) * 100)
				: clampPercent(data.progress);
	const hasPartialFailure = failedFiles > 0 && sessionState !== "failed";
	const sessionLabel =
		sessionState === "paused" &&
		data.recipients.some((recipient) => getRecipientDisplayState(recipient) === "completed")
			? "หยุดบางส่วน"
			: getDeliveryLabel(sessionState, data.direction);
	const sessionPrimaryAction = getPrimaryAction(sessionActions);
	const selectedRecipientStats = selectedRecipient ? getRecipientStats(selectedRecipient) : null;
	const selectedRecipientState = selectedRecipientStats?.state ?? "queued";
	const selectedRecipientActions = selectedRecipient
		? getAvailableActions({
				state: selectedRecipientState,
				actions: selectedRecipient.actions,
				scope: "recipient",
			})
		: null;
	const selectedRecipientPrimaryAction = selectedRecipientActions ? getPrimaryAction(selectedRecipientActions) : null;
	const hasMultipleRecipients = data.recipients.length > 1;
	const showFileActions = (selectedRecipient?.files.length ?? 0) > 1;
	const selectedRouteLabel = formatRouteLabel(selectedRecipient?.route, data.pathLabel);
	const encryptedLabel = data.encrypted === null ? "—" : data.encrypted ? "เข้ารหัส" : "ไม่ได้เข้ารหัส";
	const workLabel = `${formatFileSize(sessionTransferredBytes)} / ${formatFileSize(sessionTotalBytes)}`;

	return (
		<div className="flex min-h-full flex-col">
			<div className="flex flex-wrap items-start gap-3 mb-4">
				<Button variant="outline" size="icon" asChild>
					<ExtendLink href={backHref} linkComponent={linkComponent} asButton>
						<LuArrowLeft />
					</ExtendLink>
				</Button>

				<div className="min-w-0 flex-1">
					<div className="flex min-w-0 items-center gap-2">
						<h1 className="truncate text-xl font-semibold">{data.title}</h1>
						<StatusBadge state={sessionState} direction={data.direction} label={sessionLabel} />
					</div>
					<p className="mt-1 truncate text-sm text-muted-foreground">{data.subtitle}</p>
				</div>

				<div className="ms-auto flex max-w-full flex-wrap items-center justify-end gap-2">
					<Button variant="outline" size="sm" onClick={() => onCopyId?.(data.id)}>
						<LuCopy />
						คัดลอก ID
					</Button>
					{sessionActions.canOpenFolder ? <ActionButton action="openFolder" onClick={onOpenFolder} /> : null}
					{sessionPrimaryAction ? (
						<ActionButton
							action={sessionPrimaryAction}
							onClick={
								sessionPrimaryAction === "pause"
									? onPause
									: sessionPrimaryAction === "resume"
										? onResume
										: onRetry
							}
						/>
					) : null}
					{sessionActions.canCancel ? <ActionButton action="cancel" onClick={onCancel} /> : null}
				</div>
			</div>

			<div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
				<div className="flex min-h-0 flex-1 overflow-hidden">
					{hasMultipleRecipients && (
						<section className="flex min-h-0 w-[320px] shrink-0 flex-col overflow-hidden rounded-lg border bg-card mr-2">
							<div className="border-b px-4 py-3">
								<h2 className="font-medium">ผู้รับ</h2>
								<p className="text-sm text-muted-foreground">เลือกผู้รับเพื่อดูไฟล์และจัดการรายคน</p>
							</div>
							<ScrollArea className="min-h-0 flex-1">
								<div className="space-y-2 p-3">
									{data.recipients.map((recipient) => {
										const recipientStats = getRecipientStats(recipient);
										const selected = selectedRecipient?.id === recipient.id;
										const badgeLabel = recipientStats.hasPartialFailure ? "บางส่วน" : undefined;

										return (
											<div
												key={recipient.id}
												role="button"
												tabIndex={0}
												className={cn(
													"w-full rounded-lg border bg-background p-3 text-left transition-colors",
													selected ? "border-primary bg-primary/10" : "hover:bg-muted/60",
												)}
												onClick={() => setSelectedRecipientId(recipient.id)}
												onKeyDown={(event) => {
													if (event.key === "Enter" || event.key === " ") {
														event.preventDefault();
														setSelectedRecipientId(recipient.id);
													}
												}}
											>
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<p className="truncate text-sm font-medium">{recipient.name}</p>
														{recipient.description ? (
															<p className="truncate text-xs text-muted-foreground">
																{recipient.description}
															</p>
														) : null}
													</div>
													<StatusBadge
														state={recipientStats.state}
														direction={data.direction}
														label={badgeLabel}
													/>
												</div>
												<div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
													<span>
														{recipientStats.completedFiles}/{recipient.files.length} ไฟล์
														{recipientStats.failedFiles > 0
															? ` · ล้มเหลว ${recipientStats.failedFiles}`
															: ""}
													</span>
													<span className="tabular-nums">
														{Math.round(recipientStats.progress)}%
													</span>
												</div>
												<Progress value={recipientStats.progress} className="mt-2" />
											</div>
										);
									})}
								</div>
							</ScrollArea>
						</section>
					)}

					<DetailPanelProvider open={isDetailPanelOpen} onOpenChange={setDetailPanelOpen} width={300}>
						<DetailPanel as="section" className="rounded-lg border bg-card">
							<div className="flex items-center justify-between gap-3 border-b px-4 py-3">
								<div className="min-w-0">
									<h2 className="truncate font-medium">{selectedRecipient?.name ?? "ไม่มีผู้รับ"}</h2>

									<p className="truncate text-sm text-muted-foreground">
										{selectedRecipientStats
											? `${selectedRecipientStats.completedFiles}/${selectedRecipient?.files.length ?? 0} ไฟล์ · ${formatFileSize(selectedRecipientStats.transferredBytes)} / ${formatFileSize(selectedRecipientStats.totalBytes)}`
											: "ไม่มีไฟล์"}
									</p>
								</div>

								<DetailPanelTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-pressed={isDetailPanelOpen}
										title={isDetailPanelOpen ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
									>
										<LuInfo />
									</Button>
								</DetailPanelTrigger>
							</div>

							<ScrollArea className="min-h-0 flex-1">
								{selectedRecipient?.files.map((file, index, files) => {
									const fileState = normalizeDeliveryState(file.status);
									const fileProgress =
										fileState === "completed"
											? 100
											: file.size > 0
												? clampPercent(
														(Math.max(0, Math.min(file.transferredBytes, file.size)) /
															file.size) *
															100,
													)
												: clampPercent(file.progress);
									const fileActions = getAvailableActions({
										state: file.status,
										actions: file.actions,
										scope: "file",
									});
									const filePrimaryAction = getPrimaryAction(fileActions);

									return (
										<div key={file.id}>
											<div className="flex items-center gap-3 px-4 py-3">
												<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
													<LuFile className="size-4 text-muted-foreground" />
												</div>
												<div className="min-w-0 flex-1">
													<div className="flex items-center justify-between gap-3">
														<p className="truncate text-sm font-medium">{file.name}</p>
														<div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
															<span
																className={cn(
																	"tabular-nums",
																	fileState === "failed" && "text-destructive",
																)}
															>
																{fileState === "transferring"
																	? `${Math.round(fileProgress)}%`
																	: getFileStatusLabel(file.status)}
															</span>
														</div>
													</div>
													<p className="mt-0.5 text-xs text-muted-foreground">
														{formatFileSize(file.transferredBytes)} /{" "}
														{formatFileSize(file.size)}
													</p>
													<div className="flex items-center gap-1">
														{fileState !== "completed" ? (
															<Progress value={fileProgress} className="mt-2 h-1.5" />
														) : null}
														{showFileActions && selectedRecipient && filePrimaryAction ? (
															<div className="flex gap-1">
																<ActionButton
																	action={filePrimaryAction}
																	onClick={() => {
																		if (filePrimaryAction === "pause") {
																			onPauseFile?.(
																				selectedRecipient.id,
																				file.id,
																			);
																		} else if (filePrimaryAction === "resume") {
																			onResumeFile?.(
																				selectedRecipient.id,
																				file.id,
																			);
																		} else {
																			onRetryFile?.(
																				selectedRecipient.id,
																				file.id,
																			);
																		}
																	}}
																	size="icon"
																/>
															</div>
														) : null}
													</div>
													{fileState === "failed" && file.error ? (
														<p className="text-xs text-destructive">{file.error}</p>
													) : null}
												</div>
											</div>
											{index < files.length - 1 ? <Separator className="ml-16" /> : null}
										</div>
									);
								})}
							</ScrollArea>
						</DetailPanel>

						<DetailPanelContent className="min-h-0 space-y-4 overflow-hidden">
							<div className="rounded-lg border bg-card p-4">
								<h2 className="font-medium">รายละเอียด</h2>
								<div className="mt-4 space-y-3 text-sm">
									{selectedRecipientStats ? (
										<>
											<DetailRow
												label="สถานะผู้รับนี้"
												value={getDeliveryLabel(selectedRecipientStats.state, data.direction)}
											/>
											<DetailRow
												label="งานของผู้รับนี้"
												value={`${formatFileSize(selectedRecipientStats.transferredBytes)} / ${formatFileSize(selectedRecipientStats.totalBytes)}`}
											/>
											<DetailRow label="เส้นทางผู้รับนี้" value={selectedRouteLabel} />
										</>
									) : (
										<DetailRow label="สถานะ" value={sessionLabel} />
									)}
									<DetailRow label="งานทั้งหมด" value={workLabel} />
									<DetailRow label="เริ่มเมื่อ" value={formatOptionalDate(data.startedAt)} />
									<DetailRow label="อัปเดตล่าสุด" value={formatOptionalDate(data.updatedAt)} />
									<div className="flex justify-between gap-4">
										<span className="text-muted-foreground">ความปลอดภัย</span>
										<span className="inline-flex items-center gap-1.5">
											{data.encrypted !== null ? <LuLock className="size-3.5" /> : null}
											{encryptedLabel}
										</span>
									</div>
								</div>
							</div>

							{hasMultipleRecipients &&
							selectedRecipient &&
							selectedRecipientState !== "completed" &&
							selectedRecipientActions &&
							(selectedRecipientPrimaryAction || selectedRecipientActions.canCancel) ? (
								<div className="flex flex-col gap-2">
									<p className="text-sm font-medium">จัดการผู้รับนี้</p>
									{selectedRecipientPrimaryAction ? (
										<ActionButton
											action={selectedRecipientPrimaryAction}
											onClick={() => {
												if (selectedRecipientPrimaryAction === "pause") {
													onPauseRecipient?.(selectedRecipient.id);
												} else if (selectedRecipientPrimaryAction === "resume") {
													onResumeRecipient?.(selectedRecipient.id);
												} else {
													onRetryRecipient?.(selectedRecipient.id);
												}
											}}
										/>
									) : null}
									{selectedRecipientActions.canCancel ? (
										<ActionButton
											action="cancel"
											onClick={() => onCancelRecipient?.(selectedRecipient.id)}
										/>
									) : null}
								</div>
							) : null}
						</DetailPanelContent>
					</DetailPanelProvider>
				</div>

				<div className="rounded-lg border bg-card p-3">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
								<LuSend
									className={cn(
										"size-5 text-muted-foreground",
										(sessionState === "queued" ||
											sessionState === "transferring" ||
											sessionState === "verifying") &&
											"animate-pulse",
									)}
								/>
							</div>
							<div>
								<p className="text-sm font-medium">ความคืบหน้า</p>
								<p className="text-xs text-muted-foreground">
									{sessionLabel} · {data.recipients.length} รายการปลายทาง · {completedFiles}/
									{totalFiles} งานไฟล์เสร็จแล้ว
									{hasPartialFailure ? ` · มีบางรายการล้มเหลว (${failedFiles})` : ""}
								</p>
							</div>
						</div>
						<div className="text-right">
							<p className="text-2xl font-semibold tabular-nums">{Math.round(sessionProgress)}%</p>
							<p className="text-xs text-muted-foreground">{workLabel}</p>
						</div>
					</div>
					<Progress value={sessionProgress} className="mt-4 h-2" />
				</div>
			</div>
		</div>
	);
}

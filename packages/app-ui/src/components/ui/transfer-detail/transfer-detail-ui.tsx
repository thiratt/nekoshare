import { useCallback, useMemo, useState } from "react";

import { LuArrowLeft, LuCircleAlert, LuCircleCheck, LuColumns2, LuRows3 } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Progress } from "@workspace/ui/components/progress";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@workspace/ui/components/resizable";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";

import {
	CompletedFooter,
	FailedFooter,
	RecipientDetailPanel,
	RecipientListItem,
	RecipientSection,
	SelectionToolbar,
	StatusBadge,
	TransferringFooter,
} from "./components";
import { MOCK_DATA } from "./constants";
import type { TransferDetailData, TransferLayout, TransferStatus } from "./types";

export interface TransferDetailUIProps {
	status?: TransferStatus;
	onBack?: () => void;
	onPauseToggle?: () => void;
	onCancel?: () => void;
	onRetry?: () => void;
	onOpenFolder?: () => void;
	onDone?: () => void;
	onPauseFile?: (fileId: string) => void;
	onCancelFile?: (fileId: string) => void;
	onPauseSelected?: (fileIds: string[]) => void;
	onCancelSelected?: (fileIds: string[]) => void;
	isPaused?: boolean;
	data?: TransferDetailData;
	defaultLayout?: TransferLayout;
}

export function TransferDetailUI({
	status: statusProp,
	onBack,
	onPauseToggle,
	onCancel,
	onRetry,
	onOpenFolder,
	onDone,
	onPauseFile,
	onCancelFile,
	onPauseSelected,
	onCancelSelected,
	isPaused = false,
	data = MOCK_DATA,
	defaultLayout = "horizontal",
}: TransferDetailUIProps) {
	const isMultiRecipient = data.recipients.length > 1;
	const [layout, setLayout] = useState<TransferLayout>(isMultiRecipient ? defaultLayout : "vertical");
	const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(
		isMultiRecipient ? (data.recipients[0]?.id ?? null) : null,
	);

	const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
		if (!isMultiRecipient) return new Set(data.recipients.map((r) => r.id));
		return new Set(data.recipients.filter((r) => r.status === "transferring").map((r) => r.id));
	});

	const handleToggleExpand = useCallback((id: string, open: boolean) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (open) next.add(id);
			else next.delete(id);
			return next;
		});
	}, []);

	const selectedRecipient = useMemo(
		() => data.recipients.find((r) => r.id === selectedRecipientId) ?? null,
		[data.recipients, selectedRecipientId],
	);

	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const allFiles = useMemo(() => data.recipients.flatMap((r) => r.files), [data.recipients]);

	const selectableFiles = useMemo(
		() => allFiles.filter((f) => f.status === "transferring" || f.status === "queued" || f.status === "paused"),
		[allFiles],
	);

	const handleSelectChange = useCallback((id: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		setSelectedIds(new Set(selectableFiles.map((f) => f.id)));
	}, [selectableFiles]);

	const handleDeselectAll = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const handlePauseSelected = useCallback(() => {
		const ids = Array.from(selectedIds);
		onPauseSelected?.(ids);
		setSelectedIds(new Set());
	}, [selectedIds, onPauseSelected]);

	const handleCancelSelected = useCallback(() => {
		const ids = Array.from(selectedIds);
		onCancelSelected?.(ids);
		setSelectedIds(new Set());
	}, [selectedIds, onCancelSelected]);

	const status = useMemo<TransferStatus>(() => {
		if (statusProp) return statusProp;
		const statuses = data.recipients.map((r) => r.status);
		if (statuses.every((s) => s === "completed")) return "completed";
		if (statuses.every((s) => s === "failed")) return "failed";
		if (statuses.some((s) => s === "transferring")) return "transferring";
		if (statuses.some((s) => s === "failed")) return "failed";
		return "completed";
	}, [statusProp, data.recipients]);

	const overallProgress = useMemo(() => {
		if (!allFiles.length) return 0;
		const sum = allFiles.reduce((acc, file) => acc + file.progress, 0);
		return Math.round(sum / allFiles.length);
	}, [allFiles]);

	const totalFiles = allFiles.length;
	const completedFileCount = allFiles.filter((f) => f.status === "success").length;
	const failedFileCount = allFiles.filter((f) => f.status === "failed").length;

	const isTransferring = status === "transferring";

	const recipientCounts = useMemo(() => {
		const completed = data.recipients.filter((r) => r.status === "completed").length;
		const failed = data.recipients.filter((r) => r.status === "failed").length;
		const transferring = data.recipients.filter((r) => r.status === "transferring").length;
		return { completed, failed, transferring, total: data.recipients.length };
	}, [data.recipients]);

	const statusBanner =
		status === "completed" ? (
			<div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/50">
				<LuCircleCheck className="size-5 shrink-0 text-emerald-500" />
				<div>
					<p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Transfer complete</p>
					<p className="text-xs text-emerald-600/80 dark:text-emerald-500/70">
						{totalFiles} files sent to {recipientCounts.total}{" "}
						{recipientCounts.total === 1 ? "device" : "devices"} successfully
					</p>
				</div>
			</div>
		) : status === "failed" ? (
			<div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 dark:bg-red-950/50">
				<LuCircleAlert className="size-5 shrink-0 text-red-500" />
				<div>
					<p className="text-sm font-medium text-red-700 dark:text-red-400">Transfer failed</p>
					<p className="text-xs text-red-600/80 dark:text-red-500/70">
						{failedFileCount} {failedFileCount === 1 ? "file" : "files"} failed across{" "}
						{recipientCounts.failed} {recipientCounts.failed === 1 ? "device" : "devices"}
					</p>
				</div>
			</div>
		) : (
			<div className="rounded-xl bg-muted/50 p-4">
				<div className="mb-2 flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Overall progress</span>
					<span className="font-semibold tabular-nums">{overallProgress}%</span>
				</div>
				<Progress value={overallProgress} className="h-2" />
				<div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
					<p>
						{completedFileCount}/{totalFiles} files · {recipientCounts.completed}/{recipientCounts.total}{" "}
						devices done
					</p>
				</div>
			</div>
		);

	return (
		<CardTransition className="h-full gap-0 overflow-hidden" tag="transfer-detail-card">
			<CardHeader>
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="icon-sm" className="shrink-0 rounded-full" onClick={onBack}>
						<LuArrowLeft />
					</Button>
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate">{data.title}</CardTitle>
						<CardDescription>{data.subtitle}</CardDescription>
					</div>

					{isMultiRecipient && (
						<ToggleGroup
							type="single"
							value={layout}
							onValueChange={(v) => {
								if (v) setLayout(v as TransferLayout);
							}}
							variant="outline"
							size="sm"
						>
							<ToggleGroupItem
								value="horizontal"
								className="px-2 transition-colors"
								aria-label="Horizontal layout"
							>
								<LuColumns2 />
							</ToggleGroupItem>
							<ToggleGroupItem
								value="vertical"
								className="px-2 transition-colors"
								aria-label="Vertical layout"
							>
								<LuRows3 />
							</ToggleGroupItem>
						</ToggleGroup>
					)}

					<StatusBadge status={status} />
				</div>
			</CardHeader>

			<div className="border-b px-6 pb-5">{statusBanner}</div>

			{layout === "vertical" && (
				<CardContent className="flex-1 overflow-hidden p-0">
					<ScrollArea className="h-full">
						<div className="space-y-2 p-4">
							{isMultiRecipient && (
								<div className="sticky top-0 z-20 -mx-4 -mt-4 mb-2 flex items-center gap-3 border-b bg-card/95 px-5 py-2.5 text-xs text-muted-foreground backdrop-blur-sm">
									<span className="font-medium">{data.recipients.length} recipients</span>
									<span className="text-muted-foreground/50">·</span>
									{data.recipients.filter((r) => r.status === "transferring").length > 0 && (
										<span className="text-blue-600 dark:text-blue-400">
											{data.recipients.filter((r) => r.status === "transferring").length} active
										</span>
									)}
									{data.recipients.filter((r) => r.status === "completed").length > 0 && (
										<span className="text-emerald-600 dark:text-emerald-400">
											{data.recipients.filter((r) => r.status === "completed").length} done
										</span>
									)}
									{data.recipients.filter((r) => r.status === "failed").length > 0 && (
										<span className="text-red-600 dark:text-red-400">
											{data.recipients.filter((r) => r.status === "failed").length} failed
										</span>
									)}
								</div>
							)}

							{data.recipients.map((recipient) => (
								<RecipientSection
									key={recipient.id}
									recipient={recipient}
									selectable={isTransferring}
									selectedIds={selectedIds}
									onSelectChange={handleSelectChange}
									onPauseFile={onPauseFile}
									onCancelFile={onCancelFile}
									open={expandedIds.has(recipient.id)}
									onOpenChange={(open) => handleToggleExpand(recipient.id, open)}
								/>
							))}

							{data.recipients.length === 0 && (
								<div className="flex items-center justify-center py-12">
									<p className="text-sm text-muted-foreground">No recipients</p>
								</div>
							)}
						</div>
					</ScrollArea>
				</CardContent>
			)}

			{layout === "horizontal" && (
				<CardContent className="flex-1 overflow-hidden p-0">
					<ResizablePanelGroup direction="horizontal">
						<ResizablePanel defaultSize={35} minSize={25} maxSize={50}>
							<ScrollArea className="h-full">
								<div className="space-y-1 p-3">
									{data.recipients.map((recipient) => (
										<RecipientListItem
											key={recipient.id}
											recipient={recipient}
											isSelected={selectedRecipientId === recipient.id}
											onClick={() => setSelectedRecipientId(recipient.id)}
										/>
									))}
								</div>
								<ScrollBar orientation="horizontal" />
							</ScrollArea>
						</ResizablePanel>

						<ResizableHandle />

						<ResizablePanel defaultSize={65}>
							{selectedRecipient ? (
								<RecipientDetailPanel
									recipient={selectedRecipient}
									selectable={isTransferring}
									selectedIds={selectedIds}
									onSelectChange={handleSelectChange}
									onPauseFile={onPauseFile}
									onCancelFile={onCancelFile}
								/>
							) : (
								<div className="flex h-full items-center justify-center">
									<p className="text-sm text-muted-foreground">Select a device to view details</p>
								</div>
							)}
						</ResizablePanel>
					</ResizablePanelGroup>
				</CardContent>
			)}

			{isTransferring && (
				<SelectionToolbar
					selectedCount={selectedIds.size}
					totalSelectable={selectableFiles.length}
					onSelectAll={handleSelectAll}
					onDeselectAll={handleDeselectAll}
					onPauseSelected={handlePauseSelected}
					onCancelSelected={handleCancelSelected}
				/>
			)}

			{isTransferring && (
				<TransferringFooter
					isPaused={isPaused}
					onPauseToggle={onPauseToggle}
					onOpenFolder={onOpenFolder}
					onCancel={onCancel}
				/>
			)}
			{status === "completed" && <CompletedFooter onOpenFolder={onOpenFolder} onDone={onDone ?? onBack} />}
			{status === "failed" && <FailedFooter onRetry={onRetry} onCancel={onCancel ?? onBack} />}
		</CardTransition>
	);
}

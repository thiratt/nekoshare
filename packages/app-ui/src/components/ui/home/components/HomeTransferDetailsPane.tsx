import { LuEllipsis, LuFile, LuPause, LuRefreshCcw, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { formatBytes, formatRelativeTime, isActiveTransfer } from "../utils/transfer-utils";
import type { TransferItem } from "../types";

export function HomeTransferDetailsPane({
	transfer,
	onClose,
	onPause,
	onRetry,
}: {
	transfer: TransferItem;
	onClose: () => void;
	onPause?: () => void;
	onRetry?: () => void;
}) {
	const active = isActiveTransfer(transfer);

	return (
		<div className="flex h-full flex-col bg-muted/10">
			<div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
				<span className="text-sm font-medium">Transfer details</span>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-7"
					aria-label="Close details"
					onClick={onClose}
				>
					<LuX className="size-3.5" />
				</Button>
			</div>

			<AnimatePresence mode="wait" initial={false}>
				<motion.div
					key={transfer.id}
					initial={{ opacity: 0, x: 8 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -8 }}
					transition={{
						duration: 0.14,
						ease: [0.22, 1, 0.36, 1],
					}}
					className="min-h-0 flex-1 overflow-y-auto p-4"
				>
					<div className="flex items-start gap-3">
						<div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background">
							<LuFile className="size-4 text-muted-foreground" />
						</div>

						<div className="min-w-0">
							<h2 className="wrap-break-word text-sm font-medium">{transfer.name}</h2>

							<p className="mt-1 text-xs text-muted-foreground">
								{transfer.fileCount === 1 ? "1 file" : `${transfer.fileCount} files`}
							</p>
						</div>
					</div>

					{active && (
						<div className="mt-5">
							<div className="flex items-center justify-between text-xs">
								<span>{transfer.progress}%</span>

								<span className="text-muted-foreground">
									{formatBytes(transfer.transferredBytes)} of {formatBytes(transfer.totalBytes)}
								</span>
							</div>

							<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
								<div
									className="h-full rounded-full bg-foreground transition-[width]"
									style={{ width: `${transfer.progress}%` }}
								/>
							</div>
						</div>
					)}

					<div className="mt-5 flex gap-2">
						{active && (
							<Button
								type="button"
								variant="outline"
								className="flex-1 gap-2"
								disabled={!onPause}
								onClick={onPause}
							>
								<LuPause className="size-3.5" />
								Pause
							</Button>
						)}

						{transfer.status === "failed" && (
							<Button type="button" className="flex-1 gap-2" disabled={!onRetry} onClick={onRetry}>
								<LuRefreshCcw className="size-3.5" />
								Retry
							</Button>
						)}

						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label="More transfer actions"
							disabled
							title="TODO: Transfer action menu is not exposed by the current runtime"
						>
							<LuEllipsis className="size-4" />
						</Button>
					</div>

					<dl className="mt-5 space-y-3 border-t pt-4 text-xs">
						<DetailRow label="Direction" value={transfer.direction === "outgoing" ? "Sent" : "Received"} />

						<DetailRow label="With" value={transfer.peerName} />

						<DetailRow label="Size" value={formatBytes(transfer.totalBytes)} />

						<DetailRow label="Updated" value={formatRelativeTime(transfer.updatedAt)} />
					</dl>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<dt className="shrink-0 text-muted-foreground">{label}</dt>
			<dd className="min-w-0 truncate text-right font-medium">{value}</dd>
		</div>
	);
}

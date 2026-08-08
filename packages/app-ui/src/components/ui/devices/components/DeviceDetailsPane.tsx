import { LuSend, LuX } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";

import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { canSendToDevice } from "../utils/device-utils";
import type { DeviceItem } from "../types";

export function DeviceDetailsPane({
	device,
	onClose,
	onSendFiles,
	onRename,
	onRemove,
}: {
	device: DeviceItem;
	onClose: () => void;
	onSendFiles: () => void;
	onRename: () => void;
	onRemove: () => void;
}) {
	return (
		<div className="flex h-full flex-col bg-muted/10">
			<div className="flex h-11 shrink-0 items-center justify-between border-b px-3">
				<span className="text-sm font-medium">Device details</span>

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
					key={device.id}
					initial={{ opacity: 0, x: 8 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -8 }}
					transition={{
						duration: 0.14,
						ease: [0.22, 1, 0.36, 1],
					}}
					className="min-h-0 flex-1 overflow-y-auto p-4"
				>
					<div className="flex flex-col items-center text-center">
						<h2 className="mt-4 text-sm font-semibold">{device.name}</h2>

						<p className="mt-1 text-xs text-muted-foreground">{device.platform}</p>
					</div>

					<Button
						type="button"
						className="mt-5 w-full gap-2"
						disabled={!canSendToDevice(device)}
						onClick={onSendFiles}
					>
						<LuSend className="size-4" />

						{device.isCurrent ? "This device" : "Send files"}
					</Button>

					<dl className="mt-5 space-y-3 border-t pt-4 text-xs">
						<DetailRow label="Connection" value={device.connection ?? "Not exposed by API"} />

						<DetailRow label="Last active" value={device.lastActive} />

						<DetailRow label="App version" value={device.appVersion ?? "Not exposed by API"} />

						<DetailRow label="Fingerprint" value={device.fingerprint ?? "Unavailable"} />
					</dl>

					<div className="mt-5 space-y-1 border-t pt-3">
						<Button type="button" variant="ghost" className="h-9 w-full justify-start" onClick={onRename}>
							Rename device
						</Button>

						<Button
							type="button"
							variant="ghost"
							className="h-9 w-full justify-start"
							disabled={device.isCurrent}
							onClick={onRemove}
						>
							Remove device
						</Button>
					</div>
				</motion.div>
			</AnimatePresence>
		</div>
	);
}

function DetailRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-start justify-between gap-4">
			<dt className="shrink-0 text-muted-foreground">{label}</dt>

			<dd className="min-w-0 truncate text-right font-medium" title={value}>
				{value}
			</dd>
		</div>
	);
}

import { LuLaptop, LuMonitor, LuSmartphone, LuTablet, LuUpload } from "react-icons/lu";

import { cn } from "@workspace/ui/lib/utils";

import { canDropFiles } from "../utils/device-utils";
import type { DeviceCollectionProps } from "../types";

export function DeviceGridView({
	devices,
	selectedId,
	dropTargetId,
	onSelect,
	onDropTargetChange,
	onFiles,
	dropEnabled,
}: DeviceCollectionProps) {
	return (
		<div className="grid grid-cols-[repeat(auto-fill,180px)] content-start justify-start gap-2 p-3">
			{devices.map((device) => {
				const selected = selectedId === device.id;
				const isDropTarget = dropTargetId === device.id;

				return (
					<button
						key={device.id}
						type="button"
						aria-selected={selected}
						className={cn(
							"relative flex h-40 flex-col items-center justify-center",
							"rounded-lg border border-transparent p-4 text-center outline-none",
							"transition-[background-color,border-color,box-shadow,transform]",
							"duration-150 hover:bg-accent/60",
							"focus-visible:ring-2 focus-visible:ring-ring",
							selected && "border-border bg-accent",
							isDropTarget && "scale-[0.99] border-primary/50 bg-primary/10 ring-2 ring-primary/30",
						)}
						onClick={() => onSelect(device.id)}
						onDragEnter={(event) => {
							if (!canDropFiles(event, device, dropEnabled)) return;
							event.preventDefault();
							onDropTargetChange(device.id);
						}}
						onDragOver={(event) => {
							if (!canDropFiles(event, device, dropEnabled)) return;
							event.preventDefault();
							event.dataTransfer.dropEffect = "copy";
						}}
						onDragLeave={(event) => {
							if (
								event.relatedTarget instanceof Node &&
								event.currentTarget.contains(event.relatedTarget)
							) {
								return;
							}
							onDropTargetChange(null);
						}}
						onDrop={(event) => {
							event.preventDefault();
							onDropTargetChange(null);
							if (!canDropFiles(event, device, dropEnabled)) return;
							onFiles(device, Array.from(event.dataTransfer.files));
						}}
					>
						<div className="relative grid size-14 place-items-center rounded-xl border bg-background shadow-xs">
							<DeviceIcon kind={device.kind} className="size-6 text-muted-foreground" />

							<DeviceOnlineIndicator online={device.online} className="-bottom-0.5 -right-0.5 size-3" />
						</div>

						<p className="mt-3 max-w-full truncate text-sm font-medium">{device.name}</p>

						<p className="mt-1 text-xs text-muted-foreground">
							{device.isCurrent ? "This device" : device.online ? device.connection : device.lastActive}
						</p>

						{isDropTarget && (
							<div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 text-xs font-medium">
								<LuUpload className="size-3.5" />
								Drop to send
							</div>
						)}
					</button>
				);
			})}
		</div>
	);
}

function DeviceIcon({ kind, className }: { kind: string; className?: string }) {
	switch (kind) {
		case "desktop":
			return <LuMonitor className={className} />;

		case "laptop":
			return <LuLaptop className={className} />;

		case "phone":
			return <LuSmartphone className={className} />;

		case "tablet":
			return <LuTablet className={className} />;
	}
}

function DeviceOnlineIndicator({ online, className }: { online: boolean; className?: string }) {
	return (
		<span
			className={cn(
				"absolute rounded-full border-2 border-background",
				online ? "bg-emerald-500" : "bg-muted-foreground/40",
				className,
			)}
		/>
	);
}

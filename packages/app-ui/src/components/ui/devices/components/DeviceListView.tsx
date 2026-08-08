import { LuLaptop, LuMonitor, LuSmartphone, LuTablet } from "react-icons/lu";

import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

import { canDropFiles } from "../utils/device-utils";
import type { DeviceCollectionProps } from "../types";

export function DeviceListView({
	devices,
	selectedId,
	dropTargetId,
	onSelect,
	onDropTargetChange,
	onFiles,
	dropEnabled,
}: DeviceCollectionProps) {
	return (
		<div className="min-w-[850px]">
			<div
				className={cn(
					"sticky top-0 z-10 grid h-8",
					"grid-cols-[minmax(260px,1fr)_140px_130px_100px]",
					"items-center border-b bg-background/95 px-3",
					"text-[11px] text-muted-foreground backdrop-blur",
				)}
			>
				<span>Name</span>
				<span>Status</span>
				<span>Last active</span>
				<span>Version</span>
			</div>

			<div className="p-1.5">
				{devices.map((device) => {
					const selected = selectedId === device.id;
					const isDropTarget = dropTargetId === device.id;

					return (
						<button
							key={device.id}
							type="button"
							aria-selected={selected}
							className={cn(
								"grid min-h-12 w-full",
								"grid-cols-[minmax(260px,1fr)_140px_130px_100px]",
								"items-center rounded-md px-2 text-left outline-none",
								"transition-[background-color,box-shadow] duration-150",
								"hover:bg-accent/60",
								"focus-visible:ring-2 focus-visible:ring-ring",
								selected && "bg-accent text-accent-foreground",
								isDropTarget && "bg-primary/10 ring-2 ring-inset ring-primary/40",
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
							<DeviceName device={device} />

							<DeviceStatus device={device} />

							<span className="truncate text-xs text-muted-foreground">{device.lastActive}</span>

							<span className="truncate text-xs text-muted-foreground">{device.appVersion}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}

function DeviceName({ device }: { device: DeviceCollectionProps["devices"][number] }) {
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			<div className="relative grid size-8 shrink-0 place-items-center rounded-md border bg-background">
				<DeviceIcon kind={device.kind} className="size-4 text-muted-foreground" />

				<DeviceOnlineIndicator online={device.online} className="-bottom-0.5 -right-0.5 size-2.5" />
			</div>

			<div className="min-w-0">
				<div className="flex min-w-0 items-center gap-1.5">
					<p className="truncate text-xs font-medium">{device.name}</p>
				</div>

				<p className="mt-0.5 truncate text-[11px] text-muted-foreground">{device.platform}</p>
			</div>
		</div>
	);
}

function DeviceStatus({ device }: { device: DeviceCollectionProps["devices"][number] }) {
	if (device.isCurrent) {
		return <Badge>This device</Badge>;
	}

	return (
		<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
			{device.online ? <Badge variant="secondary">Online</Badge> : <Badge variant="destructive">Offline</Badge>}
		</span>
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

import { useEffect, useMemo, useState } from "react";

import { LuGrid2X2, LuList } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { ButtonGroup } from "@workspace/ui/components/button-group";
import { SearchInput } from "@workspace/ui/components/search-input";
import { cn } from "@workspace/ui/lib/utils";

import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { DeleteDeviceDialog } from "../dialogs/DeleteDeviceDialog";
import { ManageDeviceDialog } from "../dialogs/ManageDeviceDialog";
import { useDevicesController } from "../hooks/useDevicesController";
import { canSendToDevice, toDeviceItem } from "../utils/device-utils";
import { DeviceDetailsPane } from "./DeviceDetailsPane";
import { DeviceEmptyState } from "./DeviceEmptyState";
import { DeviceGridView } from "./DeviceGridView";
import { DeviceListView } from "./DeviceListView";
import type { DeviceView } from "../types";

export interface DevicesUIProps {
	onDropFiles?: (deviceId: string, files: File[]) => void;
	onSendFiles?: (deviceId: string) => void;
}

export function DevicesUI({ onDropFiles, onSendFiles }: DevicesUIProps = {}) {
	const controller = useDevicesController();
	const devices = useMemo(() => controller.devices.map(toDeviceItem), [controller.devices]);

	const [view, setView] = useState<DeviceView>("list");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dropTargetId, setDropTargetId] = useState<string | null>(null);

	const visibleDevices = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		return devices.filter(
			(device) =>
				query.length === 0 ||
				device.name.toLowerCase().includes(query) ||
				device.platform.toLowerCase().includes(query),
		);
	}, [devices, searchQuery]);

	const selectedDevice = devices.find((device) => device.id === selectedId) ?? null;

	useEffect(() => {
		if (selectedId && !visibleDevices.some((device) => device.id === selectedId)) {
			setSelectedId(null);
		}
	}, [selectedId, visibleDevices]);

	function openShareComposer(device: (typeof devices)[number]) {
		if (!canSendToDevice(device)) return;
		onSendFiles?.(device.id);
	}

	function startTransfer(device: (typeof devices)[number], files: File[]) {
		if (!canSendToDevice(device) || files.length === 0 || !onDropFiles) return;
		onDropFiles(device.id, files);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col bg-background">
			<header className="shrink-0 border-b">
				<div className="flex flex-wrap items-center gap-2 p-2">
					<SearchInput
						searchQuery={searchQuery}
						onSearchQuery={setSearchQuery}
						onClearSearch={() => setSearchQuery("")}
						placeholder="Search devices..."
						className="w-full shadow-none sm:w-72"
					/>

					<ButtonGroup>
						<Button
							type="button"
							variant={view === "list" ? "secondary" : "outline"}
							size="icon"
							className={cn("size-8", view === "list" && "border")}
							aria-label="List view"
							aria-pressed={view === "list"}
							onClick={() => setView("list")}
						>
							<LuList className="size-4" />
						</Button>

						<Button
							type="button"
							variant={view === "grid" ? "secondary" : "outline"}
							size="icon"
							className={cn("size-8", view === "grid" && "border")}
							aria-label="Grid view"
							aria-pressed={view === "grid"}
							onClick={() => setView("grid")}
						>
							<LuGrid2X2 className="size-4" />
						</Button>
					</ButtonGroup>
				</div>
			</header>

			{controller.error ? (
				<div className="border-b border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
					{controller.error}
				</div>
			) : null}

			<div className="flex min-h-0 flex-1">
				<main className="min-w-0 flex-1 overflow-auto">
					{controller.loading && devices.length === 0 ? (
						<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
							Loading devices...
						</div>
					) : visibleDevices.length === 0 ? (
						<DeviceEmptyState
							hasFilter={searchQuery.trim().length > 0}
							onReset={() => setSearchQuery("")}
						/>
					) : view === "list" ? (
						<DeviceListView
							devices={visibleDevices}
							selectedId={selectedId}
							dropTargetId={dropTargetId}
							onSelect={setSelectedId}
							onDropTargetChange={setDropTargetId}
							onFiles={startTransfer}
							dropEnabled={Boolean(onDropFiles)}
						/>
					) : (
						<DeviceGridView
							devices={visibleDevices}
							selectedId={selectedId}
							dropTargetId={dropTargetId}
							onSelect={setSelectedId}
							onDropTargetChange={setDropTargetId}
							onFiles={startTransfer}
							dropEnabled={Boolean(onDropFiles)}
						/>
					)}
				</main>

				<AnimatePresence initial={false}>
					{selectedDevice && (
						<motion.aside
							key="device-details"
							initial={{ width: 0 }}
							animate={{ width: 320 }}
							exit={{ width: 0 }}
							transition={{
								duration: 0.22,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="shrink-0 overflow-hidden border-l"
						>
							<motion.div
								initial={{ opacity: 0, x: 16 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 16 }}
								transition={{
									opacity: { duration: 0.12 },
									x: {
										duration: 0.18,
										ease: [0.22, 1, 0.36, 1],
									},
								}}
								className="h-full w-80"
							>
								<DeviceDetailsPane
									device={selectedDevice}
									onClose={() => setSelectedId(null)}
									onSendFiles={() => openShareComposer(selectedDevice)}
									onRename={() => controller.handleManage(selectedDevice.id)}
									onRemove={() => controller.handleDelete(selectedDevice.id)}
								/>
							</motion.div>
						</motion.aside>
					)}
				</AnimatePresence>
			</div>

			<footer className="flex h-8 shrink-0 items-center border-t bg-muted/15 px-3 text-xs text-muted-foreground">
				{visibleDevices.length} devices | {visibleDevices.filter((device) => device.online).length} online
			</footer>

			<ManageDeviceDialog
				open={controller.isManageDialogOpen}
				onOpenChange={controller.setIsManageDialogOpen}
				device={controller.selectedDevice}
				onSave={controller.handleSaveDevice}
			/>
			<DeleteDeviceDialog
				open={controller.isDeleteDialogOpen}
				onOpenChange={controller.setIsDeleteDialogOpen}
				onConfirm={controller.handleConfirmDelete}
			/>
		</div>
	);
}

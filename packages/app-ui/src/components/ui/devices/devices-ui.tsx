import { useCallback, useDeferredValue, useMemo, useState } from "react";

import { LuRefreshCcw } from "react-icons/lu";

import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import type { UiDevice } from "@workspace/app-ui/types/device";

import { DeviceCard, EmptyState } from "./components";
import { DeleteDeviceDialog, ManageDeviceDialog } from "./dialogs";

export function DevicesUI() {
	const { devices, loading, error, refresh, updateDevice, deleteDevice } = useDevices();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [selectedDevice, setSelectedDevice] = useState<UiDevice | null>(null);

	const filteredDevices = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();
		if (!normalizedQuery) return devices;
		return devices.filter(
			(device) =>
				device.name.toLowerCase().includes(normalizedQuery) ||
				device.os.toLowerCase().includes(normalizedQuery) ||
				device.ip.toLowerCase().includes(normalizedQuery)
		);
	}, [devices, deferredQuery]);

	const hasDevices = filteredDevices.length > 0;
	const showNoResults = !hasDevices && deferredQuery;

	const handleManage = useCallback(
		(deviceId: string) => {
			const device = devices.find((d) => d.id === deviceId);
			if (device) {
				setSelectedDevice(device);
				setIsManageDialogOpen(true);
			}
		},
		[devices]
	);

	const handleDelete = useCallback(
		(deviceId: string) => {
			const device = devices.find((d) => d.id === deviceId);
			if (device) {
				setSelectedDevice(device);
				setIsDeleteDialogOpen(true);
			}
		},
		[devices]
	);

	const handleSaveDevice = useCallback(
		async (id: string, name: string) => {
			await updateDevice(id, { name });
		},
		[updateDevice]
	);

	const handleConfirmDelete = useCallback(async () => {
		if (selectedDevice) {
			await deleteDevice(selectedDevice.id);
			setSelectedDevice(null);
		}
	}, [selectedDevice, deleteDevice]);

	const handleRefresh = useCallback(async () => {
		await refresh();
	}, [refresh]);

	return (
		<CardTransition className="h-full gap-4 overflow-hidden" tag="device-card">
			<CardHeader>
				<div className="space-y-1">
					<CardTitle>รายการอุปกรณ์</CardTitle>
					<CardDescription>สามารถจัดการอุปกรณ์ได้อย่างง่ายดาย</CardDescription>
				</div>
				<div className="flex">
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={handleRefresh} disabled={loading}>
							<LuRefreshCcw className={cn(loading && "animate-spin")} />
						</Button>
						<SearchInput
							placeholder="ค้นหา..."
							searchQuery={query}
							onSearchQuery={setQuery}
							onClearSearch={() => setQuery("")}
							className="w-64"
						/>
					</div>
				</div>
			</CardHeader>

			<CardContent className="pt-0">
				{error && <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>}

				{loading && !hasDevices && !showNoResults ? (
					<ScrollArea className="h-[calc(100vh-14rem)]">
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
							{[...Array(6)].map((_, i) => (
								<Card key={i} className="dark:border-accent">
									<CardHeader className="flex flex-row justify-between space-y-0 pb-2">
										<div className="flex items-center gap-2">
											<Skeleton className="size-10 rounded-full" />
											<div className="space-y-1">
												<Skeleton className="h-4 w-32" />
												<Skeleton className="h-3 w-16" />
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-2">
										<div className="flex justify-between items-center">
											<Skeleton className="h-4 w-24" />
											<Skeleton className="h-4 w-16" />
										</div>
										<div className="flex justify-between items-center">
											<Skeleton className="h-4 w-20" />
											<Skeleton className="h-4 w-24" />
										</div>
									</CardContent>
									<CardFooter className="justify-end gap-2">
										<Skeleton className="h-9 w-20" />
										<Skeleton className="h-9 w-8" />
									</CardFooter>
								</Card>
							))}
						</div>
					</ScrollArea>
				) : hasDevices ? (
					<ScrollArea className="h-[calc(100vh-14rem)]">
						<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
							{filteredDevices.map((device) => (
								<DeviceCard
									key={device.id}
									device={device}
									onManage={handleManage}
									onDelete={handleDelete}
								/>
							))}
						</div>
					</ScrollArea>
				) : showNoResults ? (
					<div
						className={cn(
							"h-[calc(100vh-14rem)] flex flex-col items-center justify-center",
							"border-2 border-dashed rounded-lg text-muted-foreground space-y-2"
						)}
					>
						<p>ไม่พบอุปกรณ์ที่ตรงกับ {deferredQuery}</p>
					</div>
				) : (
					<EmptyState />
				)}
			</CardContent>

			<ManageDeviceDialog
				open={isManageDialogOpen}
				onOpenChange={setIsManageDialogOpen}
				device={selectedDevice}
				onSave={handleSaveDevice}
			/>

			<DeleteDeviceDialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
				onConfirm={handleConfirmDelete}
			/>
		</CardTransition>
	);
}

import { memo, useCallback, useDeferredValue, useMemo, useState, useEffect } from "react";

import {
	LuBatteryCharging,
	LuBatteryFull,
	LuBatteryLow,
	LuBatteryMedium,
	LuCircle,
	LuCopy,
	LuEarth,
	LuRefreshCcw,
	LuSettings,
	LuSmartphone,
	LuTrash2,
	LuUserCheck,
} from "react-icons/lu";
import { MdLaptopWindows } from "react-icons/md";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { SearchInput } from "@workspace/ui/components/search-input";
import { cn } from "@workspace/ui/lib/utils";

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { useDevices } from "@workspace/app-ui/hooks/use-devices";
import type { Device, DevicePlatform, DeviceStatus, LocalDeviceInfo } from "@workspace/app-ui/types/device";

const PLATFORM_ICONS: Record<DevicePlatform, React.ComponentType<{ size?: number }>> = {
	windows: MdLaptopWindows,
	android: LuSmartphone,
	web: LuEarth,
	other: MdLaptopWindows,
} as const;

const STATUS_CONFIG: Record<DeviceStatus, { variant: "default" | "destructive"; className: string }> = {
	online: {
		variant: "default",
		className: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-200",
	},
	offline: {
		variant: "destructive",
		className: "",
	},
} as const;

const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

const DeviceIcon = memo(function DeviceIcon({ platform, size = 24 }: { platform: DevicePlatform; size?: number }) {
	const IconComponent = PLATFORM_ICONS[platform];
	return <IconComponent size={size} />;
});

const DeviceStatusBadge = memo(function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
	const config = STATUS_CONFIG[status];
	return (
		<Badge className={cn("[&>svg]:size-1.5", config.className)} variant={config.variant}>
			<LuCircle className="size-1 fill-current" />
			{capitalize(status)}
		</Badge>
	);
});

const DeviceBatteryIcon = memo(function DeviceBatteryIcon({
	charging,
	percent,
}: {
	charging: boolean;
	percent: number;
}) {
	const className = "w-4 h-4";

	if (charging) return <LuBatteryCharging className={className} />;
	if (percent <= 20) return <LuBatteryLow className={className} />;
	if (percent <= 50) return <LuBatteryMedium className={className} />;
	return <LuBatteryFull className={className} />;
});

interface DeviceCardProps {
	device: Device;
	onManage: (deviceId: string) => void;
	onDelete: (deviceId: string) => void;
}

const DeviceCard = memo(function DeviceCard({ device, onManage, onDelete }: DeviceCardProps) {
	const platformLabel = useMemo(() => capitalize(device.platform), [device.platform]);

	return (
		<Card className="dark:border-accent">
			<CardHeader className="flex justify-between">
				<div className="flex items-center gap-2">
					<div className="bg-foreground text-background p-2 rounded-full">
						<DeviceIcon platform={device.platform} />
					</div>
					<div className="space-y-1">
						<CardTitle>{device.name}</CardTitle>
						<CardDescription>{platformLabel}</CardDescription>
						{device.isCurrent ? (
							<Badge className="bg-amber-500 text-white dark:bg-amber-600" variant="secondary">
								<LuUserCheck className="fill-current" />
								เครื่องนี้
							</Badge>
						) : (
							<div className="flex gap-1">
								<DeviceStatusBadge status={device.status} />
							</div>
						)}
					</div>
				</div>
				{device.battery.supported && (
					<div className="space-y-1">
						<div className="flex items-center gap-1 text-muted-foreground justify-end">
							<DeviceBatteryIcon charging={device.battery.charging} percent={device.battery.percent} />
							<span>{device.battery.percent}%</span>
						</div>
					</div>
				)}
			</CardHeader>
			<CardContent>
				<div className="space-y-1 text-sm text-muted-foreground">
					<div className="flex justify-between">
						<span>ใช้งานล่าสุดเมื่อ</span>
						<span>{device.lastSeen}</span>
					</div>
					<div className="flex justify-between">
						<span>IP Address</span>
						<span className="truncate ml-2 max-w-32" title={device.ip}>
							{device.ip}
						</span>
					</div>
					<div className="flex justify-between">
						<span>ระบบปฏิบัติการ</span>
						<span className="truncate ml-2 max-w-34 2xl:max-w-60" title={device.os}>
							{device.os}
						</span>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<div className="pt-2 border-t flex gap-2 w-full">
					<Button className="flex-1" variant="outline" size="sm" onClick={() => onManage(device.id)}>
						<LuSettings />
						แก้ไข
					</Button>
					{!device.isCurrent && (
						<Button variant="destructive" size="sm" onClick={() => onDelete(device.id)}>
							<LuTrash2 />
							ลบ
						</Button>
					)}
				</div>
			</CardFooter>
		</Card>
	);
});

const EmptyState = memo(function EmptyState() {
	return (
		<div
			className={cn(
				"h-[calc(100vh-14rem)] flex flex-col items-center justify-center",
				"border-2 border-dashed rounded-lg text-muted-foreground space-y-4"
			)}
		>
			<LuCopy className="w-8 h-8 mb-2" />
			<p>ไม่พบอุปกรณ์</p>
			<p className="text-xs text-center max-w-xs">เพิ่มอุปกรณ์ใหม่โดยการเข้าสู่ระบบจากอุปกรณ์อื่น</p>
		</div>
	);
});

interface ManageDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	device: Device | null;
	onSave: (id: string, name: string) => Promise<void>;
}

function ManageDialog({ open, onOpenChange, device, onSave }: ManageDialogProps) {
	const [name, setName] = useState("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (device) setName(device.name);
	}, [device]);

	const handleSave = useCallback(async () => {
		if (!device || !name.trim()) return;

		setSaving(true);
		try {
			await onSave(device.id, name.trim());
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to save device:", error);
		} finally {
			setSaving(false);
		}
	}, [device, name, onSave, onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>แก้ไขอุปกรณ์</DialogTitle>
					<DialogDescription>เปลี่ยนชื่อหรือตั้งค่าอุปกรณ์ของคุณ</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">
					<div className="grid gap-3">
						<Label htmlFor="device-name">ชื่ออุปกรณ์</Label>
						<Input
							id="device-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="ใส่ชื่ออุปกรณ์"
							autoFocus
						/>
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline" disabled={saving}>
							ยกเลิก
						</Button>
					</DialogClose>
					<Button type="submit" onClick={handleSave} disabled={!name.trim() || saving}>
						{saving ? "กำลังบันทึก..." : "บันทึก"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface DeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}

function DeleteDialog({ open, onOpenChange, onConfirm }: DeleteDialogProps) {
	const [deleting, setDeleting] = useState(false);

	const handleConfirm = useCallback(async () => {
		setDeleting(true);
		try {
			await onConfirm();
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to delete device:", error);
		} finally {
			setDeleting(false);
		}
	}, [onConfirm, onOpenChange]);

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>ลบอุปกรณ์นี้</AlertDialogTitle>
					<AlertDialogDescription>
						แน่ใจนะว่าจะลบอุปกรณ์นี้? หลังจากลบอุปกรณ์นี้แล้ว อุปกรณ์นี้จะถูกออกจากระบบอัตโนมัติ
						และไม่สามารถยกเลิกได้
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction
						className={buttonVariants({ variant: "destructive" })}
						onClick={handleConfirm}
						disabled={deleting}
					>
						{deleting ? "กำลังลบ..." : "ใช่ ลบเลย"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

interface DevicesUIProps {
	localDeviceInfo: LocalDeviceInfo | null;
}

export function DevicesUI({ localDeviceInfo }: DevicesUIProps) {
	const { devices, loading, error, refresh, updateDevice, deleteDevice } = useDevices({
		localDeviceInfo,
	});

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	const [manageDialogOpen, setManageDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

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

	const handleManage = useCallback(
		(deviceId: string) => {
			const device = devices.find((d) => d.id === deviceId);
			if (device) {
				setSelectedDevice(device);
				setManageDialogOpen(true);
			}
		},
		[devices]
	);

	const handleDelete = useCallback(
		(deviceId: string) => {
			const device = devices.find((d) => d.id === deviceId);
			if (device) {
				setSelectedDevice(device);
				setDeleteDialogOpen(true);
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

				{hasDevices ? (
					<ScrollArea className="h-[calc(100vh-14rem)]">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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
				) : deferredQuery ? (
					<div
						className={cn(
							"h-[calc(100vh-14rem)] flex flex-col items-center justify-center",
							"border-2 border-dashed rounded-lg text-muted-foreground space-y-2"
						)}
					>
						<p>ไม่พบอุปกรณ์ที่ตรงกับ "{deferredQuery}"</p>
					</div>
				) : (
					<EmptyState />
				)}
			</CardContent>

			<ManageDialog
				open={manageDialogOpen}
				onOpenChange={setManageDialogOpen}
				device={selectedDevice}
				onSave={handleSaveDevice}
			/>

			<DeleteDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} onConfirm={handleConfirmDelete} />
		</CardTransition>
	);
}

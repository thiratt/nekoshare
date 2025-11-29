import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";

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
	LuUnplug,
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

import { CardTransition } from "@workspace/app-ui/components/ext/card-transition";
import { cn } from "@workspace/ui/lib/utils";

type DevicePlatform = "web" | "windows" | "linux" | "android";
type DeviceStatus = "online" | "offline";

interface BatteryStatus {
	percent: number;
	charging: boolean;
}

interface Device {
	id: number;
	name: string;
	current: boolean;
	platform: DevicePlatform;
	status: DeviceStatus;
	lastSeen: string;
	battery: BatteryStatus;
	ip: string;
	os: string;
	p2p: boolean;
}

const PLATFORM_ICONS: Record<DevicePlatform, React.ComponentType<{ size?: number }>> = {
	linux: MdLaptopWindows,
	windows: MdLaptopWindows,
	android: LuSmartphone,
	web: LuEarth,
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

function useDevices() {
	const [items, setItems] = useState<Device[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();

		const fetchDevices = async () => {
			setLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 350));

			if (controller.signal.aborted) return;

			const mockDevices: Device[] = [
				{
					id: 1,
					name: "Acer Nitro V15",
					current: true,
					platform: "windows",
					status: "offline",
					lastSeen: "ตอนนี้",
					battery: { charging: false, percent: 12 },
					ip: "10.45.67.20",
					os: "Windows 11",
					p2p: false,
				},
				{
					id: 2,
					name: "Chrome 136",
					current: false,
					platform: "web",
					status: "online",
					lastSeen: "2 นาทีที่แล้ว",
					battery: { charging: false, percent: 50 },
					ip: "161.156.127.72",
					os: "Brave on Windows",
					p2p: false,
				},
				{
					id: 3,
					name: "Redmi Note 12 4G",
					current: false,
					platform: "android",
					status: "offline",
					lastSeen: "40 นาทีที่แล้ว",
					battery: { charging: false, percent: 100 },
					ip: "211.226.130.51",
					os: "Android 13",
					p2p: false,
				},
				{
					id: 4,
					name: "Asus TUF FX505DD",
					current: false,
					platform: "linux",
					status: "online",
					lastSeen: "ตอนนี้",
					battery: { charging: true, percent: 80 },
					ip: "10.45.67.45",
					os: "Ubuntu 22.04",
					p2p: true,
				},
				{
					id: 5,
					name: "Gigabyte Aero 17X",
					current: false,
					platform: "windows",
					status: "online",
					lastSeen: "ตอนนี้",
					battery: { charging: true, percent: 20 },
					ip: "203.56.120.78",
					os: "Windows 10",
					p2p: false,
				},
			];

			setItems(mockDevices);
			setLoading(false);
		};

		fetchDevices();
		return () => controller.abort();
	}, []);

	const refresh = useCallback(() => {
		setLoading(true);
		setTimeout(() => setLoading(false), 500);
	}, []);

	const remove = useCallback((id: number) => {
		setItems((prev) => prev.filter((device) => device.id !== id));
	}, []);

	const update = useCallback((id: number, data: Partial<Device>) => {
		setItems((prev) => prev.map((device) => (device.id === id ? { ...device, ...data } : device)));
	}, []);

	return { items, loading, refresh, remove, update } as const;
}

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

const DeviceBatteryIcon = memo(function DeviceBatteryIcon({ status }: { status: BatteryStatus }) {
	const { charging, percent } = status;
	const className = "w-4 h-4";

	if (charging) return <LuBatteryCharging className={className} />;
	if (percent <= 20) return <LuBatteryLow className={className} />;
	if (percent <= 50) return <LuBatteryMedium className={className} />;
	return <LuBatteryFull className={className} />;
});

interface DeviceCardProps {
	device: Device;
	onManage: (deviceId: number) => void;
	onDelete: (deviceId: number) => void;
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
						{device.current ? (
							<Badge className="bg-amber-500 text-white dark:bg-amber-600" variant="secondary">
								<LuUserCheck className="fill-current" />
								เครื่องนี้
							</Badge>
						) : (
							<div className="flex gap-1">
								<DeviceStatusBadge status={device.status} />
								{device.p2p && (
									<Badge
										className="[&>svg]:size-2 bg-blue-500 text-white dark:bg-blue-600"
										variant="secondary"
									>
										<LuUnplug className="fill-current" />
										Direct Share
									</Badge>
								)}
							</div>
						)}
					</div>
				</div>
				<div className="space-y-1">
					<div className="flex items-center gap-1 text-muted-foreground justify-end">
						<DeviceBatteryIcon status={device.battery} />
						<span>{device.battery.percent}%</span>
					</div>
				</div>
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
						<span className="truncate ml-2 max-w-32" title={device.os}>
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
					{!device.current && (
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
	onSave: (id: number, name: string) => void;
}

function ManageDialog({ open, onOpenChange, device, onSave }: ManageDialogProps) {
	const [name, setName] = useState("");

	useEffect(() => {
		if (device) setName(device.name);
	}, [device]);

	const handleSave = useCallback(() => {
		if (device && name.trim()) {
			onSave(device.id, name.trim());
			onOpenChange(false);
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
						<Button variant="outline">ยกเลิก</Button>
					</DialogClose>
					<Button type="submit" onClick={handleSave} disabled={!name.trim()}>
						บันทึก
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

interface DeleteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
}

function DeleteDialog({ open, onOpenChange, onConfirm }: DeleteDialogProps) {
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
					<AlertDialogCancel>ยกเลิก</AlertDialogCancel>
					<AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={onConfirm}>
						ใช่ ลบเลย
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

export function DevicesUI() {
	const { items, loading, refresh, remove, update } = useDevices();

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);

	const [manageDialogOpen, setManageDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

	const filteredDevices = useMemo(() => {
		const normalizedQuery = deferredQuery.trim().toLowerCase();
		if (!normalizedQuery) return items;
		return items.filter(
			(device) =>
				device.name.toLowerCase().includes(normalizedQuery) ||
				device.os.toLowerCase().includes(normalizedQuery) ||
				device.ip.toLowerCase().includes(normalizedQuery)
		);
	}, [items, deferredQuery]);

	const hasDevices = filteredDevices.length > 0;

	const handleManage = useCallback(
		(deviceId: number) => {
			const device = items.find((d) => d.id === deviceId);
			if (device) {
				setSelectedDevice(device);
				setManageDialogOpen(true);
			}
		},
		[items]
	);

	const handleDelete = useCallback(
		(deviceId: number) => {
			const device = items.find((d) => d.id === deviceId);
			if (device) {
				setSelectedDevice(device);
				setDeleteDialogOpen(true);
			}
		},
		[items]
	);

	const handleSaveDevice = useCallback(
		(id: number, name: string) => {
			update(id, { name });
		},
		[update]
	);

	const handleConfirmDelete = useCallback(() => {
		if (selectedDevice) {
			remove(selectedDevice.id);
			setDeleteDialogOpen(false);
			setSelectedDevice(null);
		}
	}, [selectedDevice, remove]);

	return (
		<CardTransition className="h-full gap-4 overflow-hidden" tag="device-card">
			<CardHeader>
				<div className="space-y-1">
					<CardTitle>รายการอุปกรณ์</CardTitle>
					<CardDescription>สามารถจัดการอุปกรณ์ได้อย่างง่ายดาย</CardDescription>
				</div>
				<div className="flex">
					<div className="flex items-center gap-2">
						<Button variant="outline" onClick={refresh} disabled={loading}>
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

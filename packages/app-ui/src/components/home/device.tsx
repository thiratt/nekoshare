"use client";
import {
	Trash2,
	Copy,
	Circle,
	Settings,
	Unplug,
	Earth,
	Smartphone,
	UserCheck,
	Plug,
	BatteryCharging,
	BatteryMedium,
	BatteryLow,
	BatteryFull,
	Search,
	X,
	Clock,
} from "lucide-react";
import { MdLaptopWindows } from "react-icons/md";
import { memo, useCallback, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
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
import { SearchInput } from "@workspace/ui/components/search-input";
import { CardTransition } from "../transition-view";
import { Label } from "@workspace/ui/components/label";

// Types
type DevicePlatform = "web" | "windows" | "linux" | "android";
type DeviceStatus = "online" | "offline";

interface BatteryStatus {
	percent: number;
	charging: boolean;
}

interface DeviceBatteryIconProps {
	status: BatteryStatus;
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

// Constants
const PLATFORM_ICONS: Record<DevicePlatform, React.ComponentType<{ size?: number }>> = {
	linux: MdLaptopWindows,
	windows: MdLaptopWindows,
	android: Smartphone,
	web: Earth,
} as const;

const STATUS_STYLES = {
	online: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-200",
	offline: "",
} as const;

// Mock data - in real app, this would come from props or a hook
const mockDevices: Device[] = [
	{
		id: 1,
		name: "Acer Nitro V15",
		current: true,
		platform: "windows",
		status: "offline",
		lastSeen: "ตอนนี้",
		battery: {
			charging: false,
			percent: 12,
		},
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
		battery: {
			charging: false,
			percent: 50,
		},
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
		battery: {
			charging: false,
			percent: 100,
		},
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
		battery: {
			charging: true,
			percent: 80,
		},
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
		battery: {
			charging: true,
			percent: 20,
		},
		ip: "203.56.120.78",
		os: "Windows 10",
		p2p: false,
	},
];

// Memoized components
const DeviceIcon = memo<{ platform: DevicePlatform; size?: number }>(({ platform, size = 24 }) => {
	const IconComponent = PLATFORM_ICONS[platform];
	return <IconComponent size={size} />;
});

DeviceIcon.displayName = "DeviceIcon";

const DeviceStatusBadge = memo<{ status: DeviceStatus }>(({ status }) => (
	<Badge
		className={cn("[&>svg]:size-1.5", status === "online" && STATUS_STYLES.online)}
		variant={status === "offline" ? "destructive" : "default"}
	>
		<Circle className="size-1 fill-current" />
		{status.charAt(0).toUpperCase() + status.slice(1)}
	</Badge>
));

DeviceStatusBadge.displayName = "DeviceStatusBadge";

const DeviceBatteryIcon: React.FC<DeviceBatteryIconProps> = memo(({ status }) => {
	const { charging, percent } = status;
	const className = "w-4 h-4";

	if (charging) return <BatteryCharging className={className} />;

	if (percent <= 20) {
		return <BatteryLow className={className} />;
	}

	if (percent <= 50) {
		return <BatteryMedium className={className} />;
	}

	return <BatteryFull className={className} />;
});

DeviceBatteryIcon.displayName = "DeviceBatteryIcon";

const DeviceCard = memo<{
	device: Device;
	onManage: (deviceId: number) => void;
	onDelete: (deviceId: number) => void;
	onConnect: (deviceId: number) => void;
}>(({ device, onManage, onDelete, onConnect }) => {
	const platformLabel = useMemo(
		() => device.platform.charAt(0).toUpperCase() + device.platform.slice(1),
		[device.platform]
	);

	return (
		<Card>
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
								<UserCheck className="fill-current" />
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
										<Unplug className="fill-current" />
										P2P
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
					{/* {(device.platform === "windows" || device.platform === "linux") && !device.current && (
						<Button
							className="items-center justify-center"
							variant="outline"
							size="sm"
							onClick={() => onConnect(device.id)}
						>
							<Plug />
							เชื่อมต่อ
						</Button>
					)} */}
					<Button className="flex-1" variant="outline" size="sm" onClick={() => onManage(device.id)}>
						<Settings />
						แก้ไข
					</Button>
					{!device.current && (
						<Button variant="destructive" size="sm" onClick={() => onDelete(device.id)}>
							<Trash2 /> ลบ
						</Button>
					)}
				</div>
			</CardFooter>
		</Card>
	);
});

DeviceCard.displayName = "DeviceCard";

const EmptyState = memo<{ t: (key: string) => React.ReactNode }>(({ t }) => (
	<div
		className={cn(
			"h-[calc(100vh-14rem)] flex flex-col items-center justify-center",
			"border-2 border-dashed rounded-lg text-muted-foreground space-y-4"
		)}
	>
		<Copy className="w-8 h-8 mb-2" />
		<p>{t("content.noItems")}</p>
		<p className="text-xs text-center max-w-xs">{t("content.noItemsHint")}</p>
	</div>
));

EmptyState.displayName = "EmptyState";

export function DeviceUI() {
	const t = (message: string) => message;
	const [manageDialogOpen, setManageDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deviceToManage, setDeviceToManage] = useState<number | null>(null);
	const [deviceToDelete, setDeviceToDelete] = useState<number | null>(null);
	const [searchQuery, setSearchQuery] = useState<string>("");

	// In a real app, this would come from props or a custom hook
	const devices = useMemo(() => mockDevices, []);
	const hasDevices = devices.length > 0;

	// Event handlers - memoized to prevent unnecessary re-renders
	const handleManageDevice = useCallback((deviceId: number) => {
		console.log("Managing device:", deviceId);
		setDeviceToManage(deviceId);
		setManageDialogOpen(true);
	}, []);

	const handleDeleteDevice = useCallback((deviceId: number) => {
		setDeviceToDelete(deviceId);
		setDeleteDialogOpen(true);
	}, []);

	const handleConnectDevice = useCallback((deviceId: number) => {
		console.log("Connecting to device:", deviceId);
		// Implement P2P connection logic
	}, []);

	const confirmManage = useCallback(() => {
		if (deviceToManage) {
			console.log("Manage device:", deviceToManage);
			// Implement delete logic
			setManageDialogOpen(false);
			setDeviceToManage(null);
		}
	}, [deviceToManage]);

	const confirmDelete = useCallback(() => {
		if (deviceToDelete) {
			console.log("Deleting device:", deviceToDelete);
			// Implement delete logic
			setDeleteDialogOpen(false);
			setDeviceToDelete(null);
		}
	}, [deviceToDelete]);

	const cancelDelete = useCallback(() => {
		setDeleteDialogOpen(false);
		setDeviceToDelete(null);
	}, []);

	// Memoized device list to prevent unnecessary re-renders
	const deviceList = useMemo(
		() =>
			devices.map((device) => (
				<DeviceCard
					key={device.id}
					device={device}
					onManage={handleManageDevice}
					onDelete={handleDeleteDevice}
					onConnect={handleConnectDevice}
				/>
			)),
		[devices, handleManageDevice, handleDeleteDevice, handleConnectDevice]
	);

	return (
		<div className="h-full">
			<TooltipProvider>
				<CardTransition className="h-full gap-4 overflow-hidden" tag="device-card">
					<CardHeader className="flex items-start justify-between">
						<div className="space-y-1 flex-1">
							<CardTitle className="flex items-center gap-2">รายการอุปกรณ์</CardTitle>
							<CardDescription>สามารถจัดการอุปกรณ์ได้อย่างง่ายดาย</CardDescription>
						</div>
						<SearchInput
							searchQuery={searchQuery}
							onSearchQuery={setSearchQuery}
							onClearSearch={() => setSearchQuery("")}
						/>
					</CardHeader>

					<CardContent className="pt-0">
						{hasDevices ? (
							<ScrollArea className="h-[calc(100vh-14rem)]">
								<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">{deviceList}</div>
							</ScrollArea>
						) : (
							<EmptyState t={t} />
						)}
					</CardContent>
				</CardTransition>
			</TooltipProvider>

			{/* Device manager dialog */}
			<Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>แก้ไขอุปกรณ์</DialogTitle>
						<DialogDescription>
							ทดสอบ
							{/* Are you sure you want to remove this device? This action cannot be undone. */}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4">
						<div className="grid gap-3">
							<Label htmlFor="name-1">ชื่ออุปกรณ์</Label>
							<Input id="name-1" name="name" defaultValue="Pedro Duarte" />
						</div>
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline">ยกเลิก</Button>
						</DialogClose>
						<Button type="submit" onClick={confirmManage}>
							บันทึก
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>ลบอุปกรณ์นี้</AlertDialogTitle>
						<AlertDialogDescription>
							แน่ใจนะว่าจะลบอุปกรณ์นี้? หลังจากลบอุปกรณ์นี้แล้ว อุปกรณ์นี้จะถูกออกจากระบบอัตโนมัติ
							และไม่สามารถยกเลิกได้
							{/* Are you sure you want to remove this device? This action cannot be undone. */}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={cancelDelete}>ยกเลิก</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							onClick={confirmDelete}
						>
							ใช่ ลบเลย
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

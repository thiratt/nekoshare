import { Clipboard, File, UserCheck, UserPlus } from "lucide-react";
import { MdDevices } from "react-icons/md";
import { ClipboardCheck, FileCheck, KeyRound, LogIn, Trash2 } from "lucide-react";
import { CardTitle, CardDescription, CardContent, CardFooter, CardHeader } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { CardTransition } from "../transition-view";

type LogLevel = "info" | "success" | "warning" | "danger";

interface Log {
	icon: React.ReactNode;
	title: string;
	timestamp: string;
	device: string;
	level: LogLevel;
}

interface Shortcut {
	tag: string;
	target: string;
	title: string;
	renderItem: (value: number) => string;
	icon: React.ReactNode;
}

const logs: readonly Log[] = [
	{
		icon: <UserCheck />,
		title: "Tafoya ตอบรับคำขอการเพิ่มเพื่อน",
		timestamp: "20 January 2025 19:25:01",
		device: "Tafoya",
		level: "success",
	},
	{
		icon: <UserPlus />,
		title: "ส่งคำขอเพิ่มเพื่อนไปยัง Lunar",
		timestamp: "20 January 2025 19:25:01",
		device: "Redmi note 12 4G",
		level: "info",
	},
	// {
	// 	icon: <KeyRound />,
	// 	title: "2FA verification failed",
	// 	timestamp: "20 January 2025 19:25:01",
	// 	device: "Android-Unknown",
	// 	level: "danger",
	// },
	// {
	// 	icon: <FileCheck />,
	// 	title: "Global file updated",
	// 	timestamp: "20 January 2025 19:25:01",
	// 	device: "Thirat-Linux",
	// 	level: "info",
	// },
	{
		icon: <LogIn />,
		title: "ตรวจพบการเข้าสู่ระบบจากอุปกรณ์ใหม่",
		timestamp: "20 January 2025 19:25:01",
		device: "Chrome136",
		level: "warning",
	},
	{
		icon: <KeyRound />,
		title: "เปลี่ยนรหัสผ่าน",
		timestamp: "20 January 2025 19:25:01",
		device: "Gigabyte Aero 17X",
		level: "success",
	},
	{
		icon: <Trash2 />,
		title: "ลบอุปกรณ์ Edge 139.",
		timestamp: "20 January 2025 19:25:01",
		device: "Acer Nitro V15",
		level: "danger",
	},
	// {
	// 	icon: <KeyRound />,
	// 	title: "Two-factor authentication enabled",
	// 	timestamp: "20 January 2025 19:25:01",
	// 	device: "Thirat-Chrome136",
	// 	level: "success",
	// },
];

const shortcuts: readonly Shortcut[] = [
	// {
	// 	tag: "device-card",
	// 	target: "/home/devices",
	// 	title: "อุปกรณ์",
	// 	renderItem: (value) => `${value} item${value !== 1 ? "s" : ""}`,
	// 	icon: <MdDevices size={28} aria-hidden="true" />,
	// },
	{
		tag: "device-card",
		target: "/home/devices",
		title: "อุปกรณ์",
		renderItem: (value) => "5 อุปกรณ์",
		icon: <MdDevices size={28} aria-hidden="true" />,
	},
	{
		tag: "buddy-share-card",
		target: "/home/buddy-share",
		title: "Buddy Share",
		renderItem: (value) => "3 คน",
		icon: <UserPlus size={28} aria-hidden="true" />,
	},
] as const;

const getLogStyles = (level: LogLevel) => {
	switch (level) {
		case "info":
			return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
		case "success":
			return "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300";
		case "warning":
			return "bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
		case "danger":
			return "bg-destructive/10 text-destructive dark:bg-destructive/20";
		default:
			return "";
	}
};

type TargetType = (typeof shortcuts)[number]["target"];

interface DashboardProps {
	onCardClick: (to: TargetType) => void;
}

export function HomeUI({ onCardClick }: DashboardProps) {
	const t = (message: string) => message;

	return (
		<div className="grid gap-4">
			{/* Shortcuts Grid */}
			<div role="grid" className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label={t("shortcuts.label")}>
				{shortcuts.map((shortcut) => (
					<CardTransition
						key={shortcut.tag}
						className="cursor-pointer transition-all hover:scale-[1.01] active:scale-98"
						tag={shortcut.tag}
						onClick={() => onCardClick(shortcut.target)}
						role="button"
						aria-label={t(`shortcuts.${shortcut.title}`)}
					>
						<CardHeader className="flex flex-row items-center justify-between space-y-0">
							<div>
								<CardTitle className="text-lg">{shortcut.title}</CardTitle>
								<CardDescription>{shortcut.renderItem(5)}</CardDescription>
							</div>
							{shortcut.icon}
						</CardHeader>
					</CardTransition>
				))}
			</div>

			{/* Activity Logs */}
			<CardTransition tag="account-history-card">
				<CardHeader>
					<CardTitle>บันทึกกิจกรรม</CardTitle>
				</CardHeader>
				<CardContent>
					<ScrollArea className="h-[calc(100vh-20rem)] pr-3">
						{logs.map((log, index) => (
							<div
								key={index}
								className={`flex border items-center p-3 mb-3 rounded-xl shadow-sm ${getLogStyles(
									log.level
								)}`}
								role="listitem"
								aria-label={log.title}
							>
								<div className="mr-3" aria-hidden="true">
									{log.icon}
								</div>
								<div className="flex-1 space-y-0.5">
									<p className="text-sm font-medium">{log.title}</p>
									<p className="text-xs text-muted-foreground">{log.timestamp}</p>
								</div>
								<div className="ml-2 text-sm font-medium text-right">{log.device}</div>
							</div>
						))}
					</ScrollArea>
				</CardContent>
			</CardTransition>
		</div>
	);
}

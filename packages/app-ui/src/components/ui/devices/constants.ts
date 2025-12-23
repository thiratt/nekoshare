import type { Os, DeviceStatus } from "@workspace/app-ui/types/device";
import { LuSmartphone } from "react-icons/lu";
import { MdLaptopWindows } from "react-icons/md";
import { LuEarth } from "react-icons/lu";

export const PLATFORM_ICONS: Record<Os, React.ComponentType<{ size?: number }>> = {
	windows: MdLaptopWindows,
	android: LuSmartphone,
	web: LuEarth,
	other: MdLaptopWindows,
} as const;

export const STATUS_CONFIG: Record<
	DeviceStatus,
	{ variant: "default" | "destructive"; className: string; label: string }
> = {
	online: {
		variant: "default",
		className: "bg-green-100 text-green-800 border border-green-300 dark:bg-green-200",
		label: "ออนไลน์",
	},
	offline: {
		variant: "destructive",
		className: "",
		label: "ออฟไลน์",
	},
} as const;

export const BATTERY_THRESHOLDS = {
	LOW: 20,
	MEDIUM: 50,
} as const;

export const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

import {
	LuAppWindow,
	LuFile,
	LuFileArchive,
	LuFileAudio,
	LuFileCode,
	LuFileImage,
	LuFileJson,
	LuFileSpreadsheet,
	LuFileText,
	LuFileVideo,
	LuFolder,
	LuType,
} from "react-icons/lu";

import { cn } from "@workspace/ui/lib/utils";

export function FileIcon({ type, className }: { type: string; className?: string }) {
	const iconMap: Record<string, React.ElementType> = {
		pdf: LuFileText,
		document: LuFileText,
		spreadsheet: LuFileSpreadsheet,
		presentation: LuFile,
		text: LuFileText,
		image: LuFileImage,
		video: LuFileVideo,
		audio: LuFileAudio,
		archive: LuFileArchive,
		executable: LuAppWindow,
		font: LuType,
		code: LuFileCode,
		json: LuFileJson,
		folder: LuFolder,
	};

	const colorMap: Record<string, string> = {
		folder: "text-yellow-500 fill-yellow-500/20",
		pdf: "text-red-500",
		document: "text-blue-500",
		spreadsheet: "text-green-600",
		presentation: "text-orange-500",
		text: "text-slate-500",
		image: "text-purple-500",
		video: "text-red-500",
		audio: "text-amber-500",
		archive: "text-orange-600",
		executable: "text-cyan-600",
		font: "text-teal-500",
		code: "text-blue-400",
		json: "text-yellow-600",
	};

	const Icon = iconMap[type] || LuFile;

	const colorClass = colorMap[type] || "text-muted-foreground";

	return <Icon className={cn(colorClass, "size-5", className)} />;
}

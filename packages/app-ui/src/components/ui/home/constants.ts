import type { IconType } from "react-icons";

import { LuFileText, LuFileVideo, LuFolderArchive, LuImage } from "react-icons/lu";

export type HomeTransferStatus = "sending" | "paused";

export type HomeTransfer = {
	id: number;
	name: string;
	icon: IconType;
	target: string;
	progress: number;
	status: HomeTransferStatus;
};

export type HomeRecentItem = {
	id: number;
	name: string;
	icon: IconType;
	time: string;
};

export const homeTransfers: HomeTransfer[] = [
	{
		id: 1,
		name: "project-demo.mov",
		icon: LuFileVideo,
		target: "Max iPad",
		progress: 42,
		status: "sending",
	},
	{
		id: 2,
		name: "client-assets",
		icon: LuFolderArchive,
		target: "Office PC",
		progress: 67,
		status: "paused",
	},
];

export const homeRecentItems: HomeRecentItem[] = [
	{ id: 1, name: "presentation.pdf", icon: LuFileText, time: "2 ชม. ที่แล้ว" },
	{ id: 2, name: "screenshot.png", icon: LuImage, time: "5 ชม. ที่แล้ว" },
	{ id: 3, name: "backup.zip", icon: LuFolderArchive, time: "เมื่อวาน" },
];

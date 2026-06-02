import type { Device, Friend } from "../drop-overlay";

export type PreviewKind = "image" | "text" | "pdf" | "video" | "audio" | "unknown";

export type HomeDraftFile = {
	id: string;
	name: string;
	size: number;
	path?: string;
	sourceFile?: File;
	mimeType?: string;
	previewKind?: PreviewKind;
	previewUrl?: string;
};

export type HomeDroppedPath = {
	path: string;
	name?: string;
	size?: number;
	mimeType?: string;
	previewKind?: PreviewKind;
	previewUrl?: string;
};

export type HomeTarget = {
	id: string;
	name: string;
	description?: string;
	kind: "own-device" | "friend" | "nearby-device" | "web";
	route?: "LAN" | "Relay" | "Web";
};

export type HomeDropState = {
	isDragging: boolean;
	activeDropId: string | null;
};

export type HomeDropHandle = {
	addDroppedPaths: (entries: HomeDroppedPath[]) => void;
};

export type HomeActiveTransferItem = {
	id: string;
	transferId: string;
	fileId?: string;
	direction: "send" | "receive";
	status: "connecting" | "transferring" | "completed" | "failed" | "cancelled";
	peerName?: string;
	fileName: string;
	fileCount?: number;
	totalBytes: number;
	transferredBytes: number;
	progress: number;
	transport?: "LAN_DIRECT" | "RELAY_WS" | "UNKNOWN";
	errorMessage?: string;
	startedAt: number;
	updatedAt: number;
};

export type HomeRecentTransferItem = {
	id: string;
	transferId: string;
	fileId: string;
	direction: "send" | "receive";
	status: "completed" | "failed" | "cancelled";
	peerName?: string;
	fileName: string;
	totalBytes: number;
	transferredBytes: number;
	progress: number;
	errorMessage?: string;
	updatedAt: number;
};

export type HomeUIProps = {
	activeTransfers?: HomeActiveTransferItem[];
	dropState?: HomeDropState;
	devices?: Device[];
	friends?: Friend[];
	isLoadingRecentTransfers?: boolean;
	onResolveAudioPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolveImagePreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolvePdfPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolveTextPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolveVideoPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onViewAllRecentTransfers?: () => void;
	recentTransfers?: HomeRecentTransferItem[];
};

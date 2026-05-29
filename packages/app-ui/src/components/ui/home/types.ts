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

export type HomeUIProps = {
	dropState?: HomeDropState;
	devices?: Device[];
	friends?: Friend[];
	onResolveAudioPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolveImagePreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolvePdfPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolveTextPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
	onResolveVideoPreview?: (file: HomeDraftFile) => Promise<string | undefined>;
};

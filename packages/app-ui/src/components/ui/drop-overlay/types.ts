export type DropZoneType = "device" | "friend" | "options";

export interface DropZoneRect {
	id: string;
	type: DropZoneType;
	rect: DOMRect;
}

export interface Device {
	id: string;
	name: string;
	type: "mobile" | "desktop";
	isOnline?: boolean;
}

export interface Friend {
	id: string;
	name: string;
	avatar?: string;
	status: "online" | "offline";
}

export type FileStatus = "pending" | "uploading" | "completed" | "error";

export interface FileOptions {
	encrypt: boolean;
	compress: boolean;
	public: boolean;
	password?: string;
}

export interface FileEntry {
	id: string;
	path: string;
	name: string;
	size?: number;
	extension?: string;
	targets: string[];
	options: FileOptions;
	status: FileStatus;
	publicLink?: string;
	error?: string;
}

export interface GlobalOptions {
	encrypt: boolean;
	compress: boolean;
	public: boolean;
	password: string;
	expiration: string;
}

export interface DropPosition {
	x: number;
	y: number;
}

export interface DropOverlayState {
	isDragging: boolean;
	draggedFiles: string[];
	activeDropId: string | null;
	fileEntries: FileEntry[];
	selectedTargets: string[];
	globalOptions: GlobalOptions;
	isExpanded: boolean;
}

export interface DropOverlayActions {
	setActiveDropId: (id: string | null) => void;
	addFiles: (entries: FileEntry[]) => void;
	removeFile: (id: string) => void;
	updateFileStatus: (id: string, status: FileStatus, publicLink?: string) => void;
	toggleTarget: (targetId: string) => void;
	toggleOption: (option: "encrypt" | "compress" | "public") => void;
	setOptionValue: (key: keyof Pick<GlobalOptions, "password" | "expiration">, value: string) => void;
	setIsExpanded: (expanded: boolean) => void;
	sendFiles: () => void;
	clearCompleted: () => void;
	close: () => void;
}

export interface DropOverlayRefs {
	containerRef: React.RefObject<HTMLDivElement | null>;
}

export interface DropOverlayComputed {
	fileCount: number;
	hasFiles: boolean;
	pendingCount: number;
	uploadingCount: number;
	completedCount: number;
	showOverlay: boolean;
	isOptionsHovered: boolean;
}

export interface DropEventHandlers {
	onDragStart: (files: string[]) => void;
	onDragEnd: () => void;
	onPositionChange: (position: DropPosition) => void;
	onDrop: (files: string[], position: DropPosition) => void;
}

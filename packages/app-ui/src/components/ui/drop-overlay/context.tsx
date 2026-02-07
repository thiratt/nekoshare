import {
	createContext,
	type ReactNode,
	type RefObject,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
} from "react";

import { DEFAULT_GLOBAL_OPTIONS, POSITION_THROTTLE_MS } from "./constants";
import { cacheDropZonesFromContainer, findDropZoneAtPosition, generateId } from "./utils";
import type {
	DropEventHandlers,
	DropOverlayActions,
	DropOverlayComputed,
	DropOverlayState,
	DropPosition,
	DropZoneRect,
	FileEntry,
	FileStatus,
	GlobalOptions,
} from "./types";

interface DropOverlayContextValue {
	state: DropOverlayState;
	actions: DropOverlayActions;
	computed: DropOverlayComputed;
	containerRef: RefObject<HTMLDivElement | null>;
	handlers: DropEventHandlers;
	dropZonesRef: RefObject<DropZoneRect[]>;
}

const DropOverlayContext = createContext<DropOverlayContextValue | null>(null);
interface DropOverlayProviderProps {
	children: ReactNode;
	onSendFiles?: (files: FileEntry[], targets: string[], options: GlobalOptions) => void;
	onQuickUpload?: (files: string[], targetId: string, targetType: "device" | "friend") => void;
	onProcessFiles?: (paths: string[]) => Promise<FileEntry[]>;
}

export function DropOverlayProvider({
	children,
	onSendFiles,
	onQuickUpload,
	onProcessFiles,
}: DropOverlayProviderProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [draggedFiles, setDraggedFiles] = useState<string[]>([]);
	const [activeDropId, setActiveDropId] = useState<string | null>(null);
	const [fileEntries, setFileEntries] = useState<FileEntry[]>([]);
	const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
	const [globalOptions, setGlobalOptions] = useState<GlobalOptions>(DEFAULT_GLOBAL_OPTIONS);
	const [isExpanded, setIsExpanded] = useState(false);

	const containerRef = useRef<HTMLDivElement | null>(null);
	const dropZonesRef = useRef<DropZoneRect[]>([]);
	const activeDropIdRef = useRef<string | null>(null);
	const lastThrottleRef = useRef<number>(0);

	const addFiles = useCallback((entries: FileEntry[]) => {
		setFileEntries((prev) => [...prev, ...entries]);
	}, []);

	const removeFile = useCallback((id: string) => {
		setFileEntries((prev) => prev.filter((f) => f.id !== id));
	}, []);

	const updateFileStatus = useCallback((id: string, status: FileStatus, publicLink?: string) => {
		setFileEntries((prev) => prev.map((file) => (file.id === id ? { ...file, status, publicLink } : file)));
	}, []);

	const toggleTarget = useCallback((targetId: string) => {
		setSelectedTargets((prev) =>
			prev.includes(targetId) ? prev.filter((t) => t !== targetId) : [...prev, targetId],
		);
	}, []);

	const toggleOption = useCallback((option: "encrypt" | "compress" | "public") => {
		setGlobalOptions((prev) => {
			const newState = { ...prev, [option]: !prev[option] };
			if (option === "public" && newState.public) {
				newState.encrypt = false;
			}
			return newState;
		});
	}, []);

	const setOptionValue = useCallback((key: keyof Pick<GlobalOptions, "password" | "expiration">, value: string) => {
		setGlobalOptions((prev) => ({ ...prev, [key]: value }));
	}, []);

	const sendFiles = useCallback(() => {
		const pending = fileEntries.filter((f) => f.status === "pending");
		if (pending.length === 0) return;
		if (selectedTargets.length === 0 && !globalOptions.public) return;

		pending.forEach((f) => {
			setFileEntries((prev) =>
				prev.map((file) =>
					file.id === f.id
						? {
								...file,
								targets: selectedTargets,
								options: { ...file.options, ...globalOptions },
								status: "uploading" as FileStatus,
							}
						: file,
				),
			);

			setTimeout(
				() => {
					setFileEntries((prev) =>
						prev.map((file) => {
							if (file.id !== f.id) return file;
							const publicLink = globalOptions.public ? `https://example.com/${generateId()}` : undefined;
							return { ...file, status: "completed" as FileStatus, publicLink };
						}),
					);
				},
				1500 + Math.random() * 1000,
			);
		});

		onSendFiles?.(pending, selectedTargets, globalOptions);
	}, [fileEntries, selectedTargets, globalOptions, onSendFiles]);

	const clearCompleted = useCallback(() => {
		setFileEntries((prev) => prev.filter((f) => f.status !== "completed"));
	}, []);

	const close = useCallback(() => {
		setFileEntries([]);
		setSelectedTargets([]);
		setGlobalOptions(DEFAULT_GLOBAL_OPTIONS);
		setIsExpanded(false);
	}, []);

	const handleDragStart = useCallback((files: string[]) => {
		setIsDragging(true);
		setDraggedFiles(files);
		dropZonesRef.current = cacheDropZonesFromContainer(containerRef.current);
	}, []);

	const handleDragEnd = useCallback(() => {
		setIsDragging(false);
		setDraggedFiles([]);
		activeDropIdRef.current = null;
		setActiveDropId(null);
		dropZonesRef.current = [];
	}, []);

	const handlePositionChange = useCallback((position: DropPosition) => {
		const now = performance.now();

		if (now - lastThrottleRef.current < POSITION_THROTTLE_MS) {
			return;
		}
		lastThrottleRef.current = now;
		dropZonesRef.current = cacheDropZonesFromContainer(containerRef.current);

		const zone = findDropZoneAtPosition(position, dropZonesRef.current);
		const newId = zone?.id ?? null;

		if (activeDropIdRef.current !== newId) {
			activeDropIdRef.current = newId;
			setActiveDropId(newId);
		}
	}, []);

	const handleDrop = useCallback(
		async (files: string[], position: DropPosition) => {
			const zone = findDropZoneAtPosition(position, dropZonesRef.current);

			if (zone?.type === "options" || zone?.id === "file-list") {
				if (onProcessFiles) {
					const entries = await onProcessFiles(files);
					if (entries.length > 0) {
						addFiles(entries);
						setIsExpanded(true);
					}
				}
			} else if (zone?.type === "device" || zone?.type === "friend") {
				if (onQuickUpload && zone.id) {
					onQuickUpload(files, zone.id, zone.type);
				}
				close();
			}

			handleDragEnd();
		},
		[handleDragEnd, onQuickUpload, onProcessFiles, addFiles, close],
	);

	const computed = useMemo<DropOverlayComputed>(() => {
		const pendingCount = fileEntries.filter((f) => f.status === "pending").length;
		const uploadingCount = fileEntries.filter((f) => f.status === "uploading").length;
		const completedCount = fileEntries.filter((f) => f.status === "completed").length;
		const hasFiles = fileEntries.length > 0;

		return {
			fileCount: draggedFiles.length,
			hasFiles,
			pendingCount,
			uploadingCount,
			completedCount,
			showOverlay: isDragging || hasFiles || isExpanded,
			isOptionsHovered: activeDropId === "options" || activeDropId === "file-list",
		};
	}, [fileEntries, draggedFiles.length, isDragging, isExpanded, activeDropId]);

	const state = useMemo<DropOverlayState>(
		() => ({
			isDragging,
			draggedFiles,
			activeDropId,
			fileEntries,
			selectedTargets,
			globalOptions,
			isExpanded,
		}),
		[isDragging, draggedFiles, activeDropId, fileEntries, selectedTargets, globalOptions, isExpanded],
	);

	const actions = useMemo<DropOverlayActions>(
		() => ({
			setActiveDropId,
			addFiles,
			removeFile,
			updateFileStatus,
			toggleTarget,
			toggleOption,
			setOptionValue,
			setIsExpanded,
			sendFiles,
			clearCompleted,
			close,
		}),
		[
			addFiles,
			removeFile,
			updateFileStatus,
			toggleTarget,
			toggleOption,
			setOptionValue,
			sendFiles,
			clearCompleted,
			close,
		],
	);

	const handlers = useMemo<DropEventHandlers>(
		() => ({
			onDragStart: handleDragStart,
			onDragEnd: handleDragEnd,
			onPositionChange: handlePositionChange,
			onDrop: handleDrop,
		}),
		[handleDragStart, handleDragEnd, handlePositionChange, handleDrop],
	);

	const overlayContextValue = useMemo<DropOverlayContextValue>(
		() => ({
			state,
			actions,
			computed,
			containerRef,
			handlers,
			dropZonesRef,
		}),
		[state, actions, computed, handlers],
	);

	return <DropOverlayContext.Provider value={overlayContextValue}>{children}</DropOverlayContext.Provider>;
}

export function useDropOverlay(): DropOverlayContextValue {
	const context = useContext(DropOverlayContext);
	if (!context) {
		throw new Error("useDropOverlay must be used within a DropOverlayProvider");
	}
	return context;
}

export function useDropOverlayComputed(): DropOverlayComputed {
	const { computed } = useDropOverlay();
	return computed;
}

export function useDropOverlayActions(): DropOverlayActions {
	const { actions } = useDropOverlay();
	return actions;
}

export function useDropEventHandlers(): DropEventHandlers {
	const { handlers } = useDropOverlay();
	return handlers;
}

export function useDropZonesRef(): RefObject<DropZoneRect[]> {
	const { dropZonesRef } = useDropOverlay();
	return dropZonesRef;
}

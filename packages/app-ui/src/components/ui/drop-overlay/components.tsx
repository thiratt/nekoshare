import { memo, useMemo } from "react";

import { AnimatePresence, motion } from "motion/react";
import {
	LuArrowLeft,
	LuCalendarClock,
	LuFile,
	LuKeyRound,
	LuLaptop,
	LuLink,
	LuLock,
	LuMonitor,
	LuPackage,
	LuPlus,
	LuSend,
	LuSettings2,
	LuSmartphone,
	LuTrash2,
	LuUpload,
	LuX,
} from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldLabel } from "@workspace/ui/components/field";
import { GlassButton } from "@workspace/ui/components/glass-button";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { cn, cva, type VariantProps } from "@workspace/ui/lib/utils";

import { fadeSlideUpVariants } from "../../provide-animate";
import { EXPIRATION_OPTIONS, TRANSITION_SMOOTH, TRANSITION_SPRING } from "./constants";
import { formatFileSize, getFileIcon } from "./utils";
import type { Device, FileEntry, Friend, GlobalOptions } from "./types";

const FILE_STATUS_STYLES = {
	pending: "border-white/10 bg-white/5 hover:bg-white/8",
	uploading: "border-blue-500/20 bg-blue-500/5",
	completed: "border-green-500/20 bg-green-500/8",
	error: "border-red-500/20 bg-red-500/5",
} as const;

const FILE_ICON_STYLES = {
	pending: "bg-white/10 text-white/60",
	uploading: "bg-blue-500/20 text-blue-400",
	completed: "bg-green-500/20 text-green-400",
	error: "bg-red-500/20 text-red-400",
} as const;

const dropZoneVariants = cva(
	"transition-all duration-200 relative border will-change-[border-color,background-color]",
	{
		variants: {
			variant: {
				device: "flex items-center gap-3 rounded-xl p-4 border-white/10 bg-white/5",
				friend: "flex items-center gap-3 rounded-xl p-3 border-white/10 bg-white/5",
				options: "flex flex-1 flex-col rounded-2xl border-2 border-dashed duration-300 ease-out",
			},
			isActive: {
				true: "border-white/30 bg-white/15 shadow-lg shadow-white/5",
				false: "",
			},
		},
		compoundVariants: [
			{
				variant: "options",
				isActive: true,
				class: "",
			},
			{
				variant: "options",
				isActive: false,
				class: "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8",
			},
		],
		defaultVariants: {
			variant: "device",
			isActive: false,
		},
	},
);

interface DropZoneProps extends VariantProps<typeof dropZoneVariants> {
	data?: Device | Friend;
	dropId: string;
	dropType: "device" | "friend" | "options";
	onExpand?: () => void;
	isDragging?: boolean;
	hasFiles?: boolean;
	className?: string;
}

interface FileCardProps {
	file: FileEntry;
	onRemove: () => void;
}

interface FileListProps {
	files: FileEntry[];
	isDragging: boolean;
	isDropActive: boolean;
	onRemove: (id: string) => void;
	onClearCompleted: () => void;
	completedCount: number;
}

interface TargetSelectionProps {
	devices: Device[];
	friends: Friend[];
	selectedTargets: string[];
	onToggleTarget: (targetId: string) => void;
}

interface OptionsSelectionProps {
	globalOptions: GlobalOptions;
	onToggleOption: (option: "encrypt" | "compress" | "public") => void;
	onSetOptionValue: (key: "password" | "expiration", value: string) => void;
}

interface SummaryPanelProps {
	pendingCount: number;
	totalSize: number;
	selectedTargetInfo: { name: string; type: "device" | "friend" }[];
	globalOptions: GlobalOptions;
	canSend: boolean;
	onSend: () => void;
}

interface ConfigPanelProps {
	files: FileEntry[];
	devices: Device[];
	friends: Friend[];
	selectedTargets: string[];
	globalOptions: GlobalOptions;
	onToggleTarget: (id: string) => void;
	onToggleOption: (option: "encrypt" | "compress" | "public") => void;
	onSetOptionValue: (key: "password" | "expiration", value: string) => void;
	onSend: () => void;
}

interface HeaderProps {
	isExpanded: boolean;
	hasFiles: boolean;
	fileCount: number;
	pendingCount: number;
	uploadingCount: number;
	completedCount: number;
	fileEntries: FileEntry[];
	onCollapse: () => void;
	onExpand: () => void;
	onClose: () => void;
}

interface DropColumnProps {
	title: string;
	children: React.ReactNode;
	className?: string;
}

export const DropZone = memo(function DropZone({
	variant,
	isActive,
	data,
	dropId,
	dropType,
	className,
}: DropZoneProps) {
	const optionsIconScale = isActive ? 1.15 : 1;
	const optionsIconRotate = isActive ? 6 : 0;
	const optionsTextY = isActive ? -2 : 0;

	if (variant === "device" && data) {
		const device = data as Device;
		const Icon = device.type === "mobile" ? LuSmartphone : LuLaptop;

		return (
			<motion.div
				data-drop-id={dropId}
				data-drop-type={dropType}
				className={cn(dropZoneVariants({ variant, isActive }), className)}
			>
				<motion.div
					className={cn(
						"flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200",
						isActive ? "bg-white text-black" : "bg-white/10 text-white",
					)}
				>
					<Icon className="h-5 w-5" />
				</motion.div>
				<div className="flex-1">
					<p
						className={cn(
							"text-sm font-medium transition-colors duration-200",
							isActive ? "text-white" : "text-white/90",
						)}
					>
						{device.name}
					</p>
					<p className="text-xs text-white/40">{device.isOnline ? "Online" : "Offline"}</p>
				</div>
			</motion.div>
		);
	}

	if (variant === "friend" && data) {
		const friend = data as Friend;

		return (
			<motion.div
				data-drop-id={dropId}
				data-drop-type={dropType}
				className={cn(dropZoneVariants({ variant, isActive }), className)}
			>
				<div className="relative">
					<Avatar className="h-9 w-9 border border-white/10">
						{friend.avatar && <AvatarImage src={friend.avatar} />}
						<AvatarFallback className="bg-white/10 text-xs text-white">
							{friend.name.charAt(0)}
						</AvatarFallback>
					</Avatar>
					<span
						className={cn(
							"absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black/60",
							friend.status === "online" ? "bg-green-400" : "bg-white/30",
						)}
					/>
				</div>
				<p
					className={cn(
						"text-sm font-medium transition-colors duration-200",
						isActive ? "text-white" : "text-white/90",
					)}
				>
					{friend.name}
				</p>
			</motion.div>
		);
	}

	if (variant === "options") {
		return (
			<motion.div
				data-drop-id={dropId}
				data-drop-type={dropType}
				className={cn(dropZoneVariants({ variant, isActive }), className)}
				style={{
					willChange: isActive ? "transform, border-color, background-color" : "auto",
				}}
			>
				<div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center z-10">
					<motion.div
						className={cn(
							"flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-200",
							isActive ? "bg-white text-black" : "bg-white/10 text-white",
						)}
						animate={{ scale: optionsIconScale, rotate: optionsIconRotate }}
						transition={TRANSITION_SPRING}
					>
						<LuSettings2 className="h-7 w-7" />
					</motion.div>
					<motion.div className="space-y-1" animate={{ y: optionsTextY }} transition={TRANSITION_SPRING}>
						<p className="text-lg font-medium transition-colors duration-200 text-background dark:text-foreground">
							{isActive ? "Release to configure" : "Advanced Options"}
						</p>
						<p className="text-sm text-muted dark:text-muted-foreground">
							{isActive ? "Set targets, encryption & more" : "Drop files to customize sharing"}
						</p>
					</motion.div>
				</div>
				<AnimatePresence>
					{isActive && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={TRANSITION_SMOOTH}
							className="pointer-events-none absolute inset-0 rounded-2xl"
							style={{
								background:
									"radial-gradient(ellipse at center, rgba(255,255,255,0.1) 0%, transparent 70%)",
							}}
						/>
					)}
				</AnimatePresence>
			</motion.div>
		);
	}

	return null;
});

export const FileCard = memo(function FileCard({ file, onRemove }: FileCardProps) {
	const FileIcon = getFileIcon(file.extension || "");
	const { status, name, extension, size, publicLink } = file;

	const handleCopy = () => {
		if (publicLink) navigator.clipboard.writeText(publicLink);
	};

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
			transition={TRANSITION_SPRING}
			className={cn(
				"group flex items-center gap-3 rounded-xl border p-3 transition-colors w-full",
				FILE_STATUS_STYLES[status],
			)}
		>
			<div
				className={cn(
					"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
					FILE_ICON_STYLES[status],
				)}
			>
				{status === "uploading" ? (
					<motion.div
						animate={{ rotate: 360 }}
						transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
					>
						<LuFile className="h-5 w-5" />
					</motion.div>
				) : status === "completed" ? (
					<LuFile className="h-5 w-5" />
				) : (
					<FileIcon className="h-5 w-5" />
				)}
			</div>

			<div className="min-w-0 flex-1">
				<p className="break-all font-medium text-white">{name}</p>
				<div className="flex items-center gap-1 text-sm text-white/60">
					{extension && <span>{extension.toUpperCase()}</span>}
					{size && (
						<>
							<span>•</span>
							<span>{formatFileSize(size)}</span>
						</>
					)}
					{publicLink && (
						<>
							<span>•</span>
							<span className="text-green-400 truncate">{publicLink}</span>
						</>
					)}
				</div>
			</div>

			{status === "pending" && (
				<Button variant="destructive" size="icon-sm" onClick={onRemove}>
					<LuTrash2 className="h-4 w-4" />
				</Button>
			)}
			{status === "completed" && publicLink && (
				<Button
					variant="ghost"
					size="icon"
					onClick={handleCopy}
					className="h-8 w-8 shrink-0 text-white/40 hover:bg-white/10 hover:text-white"
				>
					<LuLink className="h-4 w-4" />
				</Button>
			)}
		</motion.div>
	);
});

export const FileList = memo(function FileList({
	files,
	isDragging,
	isDropActive,
	onRemove,
	onClearCompleted,
	completedCount,
}: FileListProps) {
	const hasFiles = files.length > 0;

	return (
		<div className="flex flex-col gap-4 h-full w-md xl:w-lg 2xl:w-xl transition-all">
			<div className="flex items-center justify-between">
				<h3 className="text-xs font-medium uppercase tracking-wider text-muted dark:text-muted-foreground">
					Files ({files.length})
				</h3>
				{completedCount > 0 && (
					<Button
						variant="ghost"
						size="sm"
						onClick={onClearCompleted}
						className="text-xs text-muted hover:text-muted hover:bg-background/10 rounded-full"
					>
						Clear completed
					</Button>
				)}
			</div>

			<ScrollArea
				className="relative h-[calc(100vh-12rem)] rounded-xl border border-white/10 bg-white/5"
				data-drop-id="file-list"
				data-drop-type="options"
			>
				<div className="p-4 space-y-2">
					<AnimatePresence mode="popLayout">
						{files.map((file) => (
							<FileCard key={file.id} file={file} onRemove={() => onRemove(file.id)} />
						))}
					</AnimatePresence>

					{!hasFiles && !isDragging && (
						<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white/60">
							<LuFile className="w-12 h-12 mb-2" />
							<p>No files selected</p>
							<p className="text-sm opacity-60">Drop files here to add them</p>
						</div>
					)}

					<AnimatePresence>
						{isDragging && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className={cn(
									"absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-black/30 transition-colors",
									isDropActive && "bg-black/60",
								)}
							>
								<LuPlus className="h-5 w-5 text-white/60" />
								<span className="text-sm text-white/60">
									{isDropActive ? "Release to add files" : "Drag files here"}
								</span>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
				<ScrollBar orientation="vertical" />
			</ScrollArea>
		</div>
	);
});

export const TargetSelection = memo(function TargetSelection({
	devices,
	friends,
	selectedTargets,
	onToggleTarget,
}: TargetSelectionProps) {
	return (
		<div className="space-y-3">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted dark:text-muted-foreground">
				Send to
			</h3>
			<div className="grid grid-cols-2 gap-2">
				{devices.map((device) => (
					<GlassButton
						key={device.id}
						sublabel={`${device.type === "mobile" ? "Mobile" : "Desktop"} • ${device.isOnline ? "Online" : "Offline"}`}
						icon={device.type === "mobile" ? <LuSmartphone /> : <LuMonitor />}
						selected={selectedTargets.includes(`device-${device.id}`)}
						onClick={() => onToggleTarget(`device-${device.id}`)}
						withCheck
					>
						{device.name}
					</GlassButton>
				))}
				{friends.map((friend) => (
					<GlassButton
						key={friend.id}
						sublabel={`Friend • ${friend.status === "online" ? "Online" : "Offline"}`}
						avatar={friend.avatar}
						avatarFallback={friend.name.charAt(0)}
						selected={selectedTargets.includes(`friend-${friend.id}`)}
						onClick={() => onToggleTarget(`friend-${friend.id}`)}
						withCheck
					>
						{friend.name}
					</GlassButton>
				))}
			</div>
		</div>
	);
});

export const OptionsSelection = memo(function OptionsSelection({
	globalOptions,
	onToggleOption,
	onSetOptionValue,
}: OptionsSelectionProps) {
	return (
		<div className="space-y-3">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted dark:text-muted-foreground">
				Options
			</h3>
			<div className="grid grid-cols-3 gap-2">
				<GlassButton
					icon={<LuLock className="h-4 w-4" />}
					sublabel="End-to-end encryption"
					selected={globalOptions.encrypt}
					onClick={() => onToggleOption("encrypt")}
					disabled={globalOptions.public}
					orientation="vertical"
				>
					Encrypt
				</GlassButton>
				<GlassButton
					icon={<LuPackage className="h-4 w-4" />}
					sublabel="Reduce file size"
					selected={globalOptions.compress}
					onClick={() => onToggleOption("compress")}
					orientation="vertical"
				>
					Compress
				</GlassButton>
				<GlassButton
					icon={<LuLink className="h-4 w-4" />}
					sublabel="Anyone with link"
					selected={globalOptions.public}
					onClick={() => onToggleOption("public")}
					orientation="vertical"
				>
					Public Link
				</GlassButton>
			</div>

			<AnimatePresence mode="wait" initial={false}>
				{globalOptions.public && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={TRANSITION_SMOOTH}
						className="space-y-3 pt-2"
					>
						<Field className="text-white">
							<FieldLabel htmlFor="password-input">Password Protection</FieldLabel>
							<div className="relative">
								<LuKeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
								<Input
									id="password-input"
									type="password"
									placeholder="Optional password"
									value={globalOptions.password}
									onChange={(e) => onSetOptionValue("password", e.target.value)}
									className="pl-9 rounded-xl bg-background/5 focus-visible:border-white focus-visible:ring-white/50 selection:bg-white/60 placeholder:text-white/60"
								/>
							</div>
						</Field>

						<Field className="text-white">
							<FieldLabel>Expiration</FieldLabel>
							<div className="relative">
								<Select
									value={globalOptions.expiration}
									onValueChange={(value) => onSetOptionValue("expiration", value)}
								>
									<SelectTrigger className="w-full rounded-xl pl-9 pr-3 bg-background/5 [&_svg]:opacity-100 [&_svg]:last:stroke-white">
										<LuCalendarClock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
										<SelectValue placeholder="Select expiration" />
									</SelectTrigger>
									<SelectContent className="bg-background/5 backdrop-blur-xl text-white border-white/40 rounded-xl [&_svg]:stroke-white dark:bg-muted/70 dark:backdrop-blur-md dark:border-white/30">
										{EXPIRATION_OPTIONS.map((option) => (
											<SelectItem
												key={option.value}
												className="hover:[&_svg]:stroke-foreground dark:hover:[&_svg]:stroke-foreground"
												value={option.value}
											>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</Field>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

export const SummaryPanel = memo(function SummaryPanel({
	pendingCount,
	totalSize,
	selectedTargetInfo,
	globalOptions,
	canSend,
	onSend,
}: SummaryPanelProps) {
	const optionsText = useMemo(() => {
		const options = [globalOptions.encrypt && "Encrypted", globalOptions.compress && "Compressed"].filter(Boolean);
		return options.join(" • ") || "No options selected";
	}, [globalOptions.encrypt, globalOptions.compress]);

	const buttonText = useMemo(() => {
		if (canSend) {
			return `Send ${pendingCount} ${pendingCount === 1 ? "file" : "files"}`;
		}
		if (selectedTargetInfo.length === 0 && !globalOptions.public) {
			return "Select a target or enable public link";
		}
		return "No files to send";
	}, [canSend, pendingCount, selectedTargetInfo.length, globalOptions.public]);

	return (
		<div className="mt-auto space-y-4">
			<div className="rounded-xl border border-white/10 bg-white/5 p-4">
				<div className="flex items-start justify-between">
					<div className="space-y-2">
						<p className="text-lg text-white">Summary</p>
						<div className="space-y-1 text-sm text-white/60">
							<p>
								{pendingCount} {pendingCount === 1 ? "file" : "files"} ready to send
								{totalSize > 0 && <span className="text-white/40"> • {formatFileSize(totalSize)}</span>}
							</p>
							{selectedTargetInfo.length > 0 && (
								<p>
									Sending to{" "}
									<span className="text-white">
										{selectedTargetInfo.map((t) => t.name).join(", ")}
									</span>
								</p>
							)}
							{globalOptions.public && (
								<p>
									<span className="text-blue-400">Public link will be generated</span>
								</p>
							)}
							<p className="text-white/40">{optionsText}</p>
						</div>
					</div>
					<div className="text-right">
						<p className="text-2xl font-semibold text-white">{selectedTargetInfo.length}</p>
						<p className="text-xs text-white/40">
							{selectedTargetInfo.length === 1 ? "target" : "targets"}
						</p>
					</div>
				</div>
			</div>

			<Button
				onClick={onSend}
				disabled={!canSend}
				className={cn(
					"h-12 w-full text-base font-medium transition-all duration-200",
					canSend ? "bg-white text-black hover:bg-white/90" : "bg-white/10 text-white/40",
				)}
			>
				<LuSend className="mr-2 h-5 w-5" />
				{buttonText}
			</Button>
		</div>
	);
});

export const ConfigPanel = memo(function ConfigPanel({
	files,
	devices,
	friends,
	selectedTargets,
	globalOptions,
	onToggleTarget,
	onToggleOption,
	onSetOptionValue,
	onSend,
}: ConfigPanelProps) {
	const pendingCount = useMemo(() => files.filter((f) => f.status === "pending").length, [files]);

	const canSend = useMemo(
		() => pendingCount > 0 && (selectedTargets.length > 0 || globalOptions.public),
		[pendingCount, selectedTargets.length, globalOptions.public],
	);

	const selectedTargetInfo = useMemo(() => {
		const info: { name: string; type: "device" | "friend" }[] = [];
		for (const id of selectedTargets) {
			if (id.startsWith("device-")) {
				const device = devices.find((d) => `device-${d.id}` === id);
				if (device) info.push({ name: device.name, type: "device" });
			} else if (id.startsWith("friend-")) {
				const friend = friends.find((f) => `friend-${f.id}` === id);
				if (friend) info.push({ name: friend.name, type: "friend" });
			}
		}
		return info;
	}, [selectedTargets, devices, friends]);

	const totalSize = useMemo(() => files.reduce((acc, f) => acc + (f.size || 0), 0), [files]);

	return (
		<div className="flex-1 flex flex-col">
			<ScrollArea className="h-[calc(100vh-23rem)]">
				<AnimatePresence mode="wait" initial={false}>
					{!globalOptions.public && (
						<motion.div
							key="targets"
							initial={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
							animate={{ opacity: 1, height: "auto", scale: 1, marginBottom: "1rem" }}
							exit={{ opacity: 0, height: 0, scale: 0.95, marginBottom: 0 }}
							transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
						>
							<TargetSelection
								devices={devices}
								friends={friends}
								selectedTargets={selectedTargets}
								onToggleTarget={onToggleTarget}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				<OptionsSelection
					globalOptions={globalOptions}
					onToggleOption={onToggleOption}
					onSetOptionValue={onSetOptionValue}
				/>
			</ScrollArea>

			<SummaryPanel
				pendingCount={pendingCount}
				totalSize={totalSize}
				selectedTargetInfo={selectedTargetInfo}
				globalOptions={globalOptions}
				canSend={canSend}
				onSend={onSend}
			/>
		</div>
	);
});

export const Header = memo(function Header({
	isExpanded,
	hasFiles,
	fileCount,
	pendingCount,
	uploadingCount,
	completedCount,
	fileEntries,
	onCollapse,
	onExpand,
	onClose,
}: HeaderProps) {
	const fileLabel = fileCount === 1 ? "file" : "files";

	const subtitle = useMemo(() => {
		if (isExpanded) {
			const parts: string[] = [];
			if (pendingCount > 0) parts.push(`${pendingCount} pending`);
			if (uploadingCount > 0) parts.push(`${uploadingCount} uploading`);
			if (completedCount > 0) parts.push(`${completedCount} completed`);
			return `${fileEntries.length} ${fileEntries.length === 1 ? "file" : "files"} • ${parts.join(", ")}`;
		}
		if (hasFiles) {
			const parts: React.ReactNode[] = [];
			if (pendingCount > 0) parts.push(<span key="pending">{pendingCount} pending</span>);
			if (uploadingCount > 0)
				parts.push(
					<span key="uploading" className="text-blue-400">
						{uploadingCount} uploading
					</span>,
				);
			if (completedCount > 0)
				parts.push(
					<span key="completed" className="text-green-400">
						{completedCount} completed
					</span>,
				);
			return <span className="flex items-center gap-2">{parts}</span>;
		}
		return `${fileCount} ${fileLabel} selected`;
	}, [isExpanded, hasFiles, fileCount, fileLabel, pendingCount, uploadingCount, completedCount, fileEntries.length]);

	return (
		<motion.div
			variants={fadeSlideUpVariants}
			initial="hidden"
			animate="visible"
			className="flex items-center justify-between"
			data-tauri-drag-region
		>
			<div className="pointer-events-none flex items-center gap-3">
				{isExpanded && (
					<Button
						size="icon"
						onClick={onCollapse}
						variant="ghost"
						className="pointer-events-auto rounded-full border border-white/10 bg-white/5 text-white"
					>
						<LuArrowLeft className="h-5 w-5" />
					</Button>
				)}
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
					{isExpanded ? (
						<LuSettings2 className="h-6 w-6 text-white" />
					) : hasFiles ? (
						<LuFile className="h-6 w-6 text-white" />
					) : (
						<LuUpload className="h-6 w-6 text-white" />
					)}
				</div>
				<div>
					<h2 className="text-lg font-semibold tracking-tight text-white">
						{isExpanded ? "Configure & Send" : hasFiles ? "Files Ready" : "Drop to share"}
					</h2>
					<p className="text-sm text-muted/70 dark:text-muted-foreground">{subtitle}</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{!isExpanded && hasFiles && (
					<Button
						variant="ghost"
						onClick={onExpand}
						className="text-muted hover:text-muted hover:bg-background/10 rounded-full dark:text-foreground"
					>
						<LuSettings2 className="mr-2 h-4 w-4" />
						Configure
					</Button>
				)}
				<Button
					size="icon"
					onClick={onClose}
					variant="ghost"
					className="rounded-full border border-white/10 bg-white/5 text-white"
				>
					<LuX className="h-5 w-5" />
				</Button>
			</div>
		</motion.div>
	);
});

export function DropColumn({ title, children, className }: DropColumnProps) {
	return (
		<motion.div layout="position" className={cn("flex flex-1 flex-col gap-3 min-w-0", className)}>
			<h3 className="px-1 text-xs font-medium uppercase tracking-wider text-muted dark:text-muted-foreground whitespace-nowrap">
				{title}
			</h3>
			<div className="flex flex-1 flex-col gap-2">{children}</div>
		</motion.div>
	);
}

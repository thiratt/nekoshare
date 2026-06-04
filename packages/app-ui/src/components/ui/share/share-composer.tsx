import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";

import { AnimatePresence, motion } from "motion/react";
import {
	LuArrowLeft,
	LuFile,
	LuFolderDown,
	LuLaptop,
	LuLink,
	LuPlus,
	LuSend,
	LuSettings2,
	LuShieldCheck,
	LuSmartphone,
	LuUsers,
	LuX,
} from "react-icons/lu";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Switch } from "@workspace/ui/components/switch";
import { cn } from "@workspace/ui/lib/utils";

import { AppLink } from "@workspace/app-ui/components/app-link";

import { formatFileSize, getFileExtension, getFileIcon, getFileName } from "../drop-overlay";

export type ShareComposerTarget = {
	id: string;
	name: string;
	type: "device" | "friend";
	deviceType?: "desktop" | "mobile";
	avatar?: string;
	isOnline?: boolean;
	description?: string;
};

type DraftFile = {
	id: string;
	name: string;
	size: number;
	path?: string;
};

type SendOptions = {
	encrypt: boolean;
	publicShare: boolean;
	password: string;
};

export type ShareComposerProps = {
	devices?: ShareComposerTarget[];
	friends?: ShareComposerTarget[];
	dropState?: ShareComposerDropState;
	backHref: string;
	onSend?: (payload: { files: DraftFile[]; targetIds: string[]; options: SendOptions }) => void;
};

export type ShareComposerDroppedPath = {
	path: string;
	name?: string;
	size?: number;
};

export type ShareComposerHandle = {
	addDroppedPaths: (entries: ShareComposerDroppedPath[]) => void;
};

export type ShareComposerDropState = {
	isDragging: boolean;
	activeDropId: string | null;
};

const MOCK_DEVICES: ShareComposerTarget[] = [
	{
		id: "mock-device-1",
		name: "Windows Desktop",
		type: "device",
		deviceType: "desktop",
		isOnline: true,
		description: "Direct LAN ready",
	},
	{
		id: "mock-device-2",
		name: "Galaxy A55",
		type: "device",
		deviceType: "mobile",
		isOnline: true,
		description: "Nearby",
	},
];

const MOCK_FRIENDS: ShareComposerTarget[] = [
	{
		id: "mock-friend-1",
		name: "Max",
		type: "friend",
		isOnline: true,
		description: "Online",
	},
	{
		id: "mock-friend-2",
		name: "Mina",
		type: "friend",
		isOnline: false,
		description: "Offline",
	},
];

function createDraftFile(file: File): DraftFile {
	return {
		id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
		name: file.name,
		size: file.size,
	};
}

function createDraftFileFromPath(entry: ShareComposerDroppedPath): DraftFile {
	const name = entry.name ?? getFileName(entry.path);
	return {
		id: `${entry.path}-${entry.size ?? 0}-${Math.random().toString(36).slice(2)}`,
		name,
		path: entry.path,
		size: entry.size ?? 0,
	};
}

function getFilesFromTransfer(dataTransfer: DataTransfer) {
	return Array.from(dataTransfer.files);
}

function getTargetIcon(target: ShareComposerTarget) {
	if (target.type === "friend") return LuUsers;
	return target.deviceType === "mobile" ? LuSmartphone : LuLaptop;
}

function DraftFileRow({ file, onRemove }: { file: DraftFile; onRemove: (id: string) => void }) {
	const extension = getFileExtension(file.name);
	const Icon = extension ? getFileIcon(extension) : LuFile;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -8 }}
			className="flex items-center gap-3 rounded-lg border bg-background p-3"
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
				<Icon className="size-5" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{file.name}</p>
				<div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
					<span>{formatFileSize(file.size) || "ไม่ทราบขนาด"}</span>
				</div>
			</div>
			<Button type="button" variant="ghost" size="icon" onClick={() => onRemove(file.id)}>
				<LuX />
			</Button>
		</motion.div>
	);
}

function TargetTile({
	active,
	disabled,
	target,
	onClick,
}: {
	active: boolean;
	disabled?: boolean;
	target: ShareComposerTarget;
	onClick: () => void;
}) {
	const Icon = getTargetIcon(target);

	return (
		<button
			type="button"
			disabled={disabled}
			className={cn(
				"flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors",
				active ? "border-primary bg-primary/10" : "hover:bg-muted/70",
				disabled && "cursor-not-allowed opacity-50 hover:bg-background",
			)}
			onClick={onClick}
		>
			{target.type === "friend" ? (
				<Avatar className="size-10 border">
					{target.avatar ? <AvatarImage src={target.avatar} /> : null}
					<AvatarFallback>{target.name.slice(0, 1).toUpperCase()}</AvatarFallback>
				</Avatar>
			) : (
				<div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
					<Icon className="size-5 text-muted-foreground" />
				</div>
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium">{target.name}</p>
				<p className="truncate text-xs text-muted-foreground">
					{target.description ?? (target.isOnline ? "พร้อมรับไฟล์" : "ออฟไลน์")}
				</p>
			</div>
			<span
				className={cn(
					"size-2.5 rounded-full",
					target.isOnline === false ? "bg-muted-foreground/40" : "bg-green-500",
				)}
			/>
		</button>
	);
}

export const ShareComposer = forwardRef<ShareComposerHandle, ShareComposerProps>(function ShareComposer(
	{ devices, friends, dropState, backHref, onSend },
	ref,
) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [files, setFiles] = useState<DraftFile[]>([]);
	const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
	const [isBrowserDraggingOverStage, setIsBrowserDraggingOverStage] = useState(false);
	const [options, setOptions] = useState<SendOptions>({
		encrypt: true,
		publicShare: false,
		password: "",
	});

	const deviceTargets = devices && devices.length > 0 ? devices : MOCK_DEVICES;
	const friendTargets = friends && friends.length > 0 ? friends : MOCK_FRIENDS;
	const canSend = files.length > 0 && (options.publicShare || selectedTargetIds.length > 0);
	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	const isDraggingInApp = dropState?.isDragging ?? false;
	const isStageDropActive = dropState?.activeDropId === "file-stage" || isBrowserDraggingOverStage;
	const showStageDropOverlay = isDraggingInApp || isBrowserDraggingOverStage;

	const addFilesToStage = useCallback((incomingFiles: File[]) => {
		if (incomingFiles.length === 0) return;
		setFiles((current) => [...incomingFiles.map(createDraftFile), ...current]);
	}, []);

	const addPathEntriesToStage = useCallback((entries: ShareComposerDroppedPath[]) => {
		if (entries.length === 0) return;
		setFiles((current) => [...entries.map(createDraftFileFromPath), ...current]);
	}, []);

	const handleSendPending = useCallback(() => {
		if (files.length === 0) return;
		if (!options.publicShare && selectedTargetIds.length === 0) return;

		onSend?.({
			files,
			targetIds: options.publicShare ? [] : selectedTargetIds,
			options,
		});
	}, [files, onSend, options, selectedTargetIds]);

	useImperativeHandle(
		ref,
		() => ({
			addDroppedPaths: addPathEntriesToStage,
		}),
		[addPathEntriesToStage],
	);

	const toggleTarget = useCallback(
		(targetId: string) => {
			if (options.publicShare) return;
			setSelectedTargetIds((current) =>
				current.includes(targetId) ? current.filter((id) => id !== targetId) : [...current, targetId],
			);
		},
		[options.publicShare],
	);

	const handleInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			addFilesToStage(Array.from(event.target.files ?? []));
			event.target.value = "";
		},
		[addFilesToStage],
	);

	const handleStageDrop = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsBrowserDraggingOverStage(false);
			addFilesToStage(getFilesFromTransfer(event.dataTransfer));
		},
		[addFilesToStage],
	);

	const handlePublicShareChange = useCallback((publicShare: boolean) => {
		setOptions((current) => ({
			...current,
			publicShare,
			encrypt: publicShare ? true : current.encrypt,
		}));
		if (publicShare) {
			setSelectedTargetIds([]);
		}
	}, []);

	return (
		<div className="flex h-full min-h-0 flex-col gap-4">
			<input ref={inputRef} type="file" multiple className="hidden" onChange={handleInputChange} />

			<div className="flex items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<Button type="button" variant="outline" size="icon" asChild>
						<AppLink href={backHref} asButton>
							<LuArrowLeft />
						</AppLink>
					</Button>
					<div className="min-w-0">
						<h1 className="truncate text-xl font-semibold">อัปโหลดไฟล์</h1>
						<p className="truncate text-sm text-muted-foreground">
							เลือกไฟล์จากคอมพิวเตอร์หรืออุปกรณ์ของคุณแล้วแชร์กับเพื่อน ๆ ได้เลย
						</p>
					</div>
				</div>
				<Button type="button" disabled={!canSend} onClick={handleSendPending}>
					<LuSend />
					แชร์เลย
				</Button>
			</div>

			<div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,360px)_1fr] gap-2">
				<section className="relative flex min-h-0 flex-1 flex-col rounded-lg border bg-card">
					<div className="border-b px-4 py-3">
						<h2 className="font-medium">ผู้รับ</h2>
						<p className="text-sm text-muted-foreground">เลือกผู้รับเพื่อแชร์ไฟล์</p>
					</div>
					<ScrollArea className="min-h-0 flex-1">
						<div className="space-y-2 px-4 py-2">
							<div className="space-y-2">
								<p className="text-xs font-medium uppercase text-muted-foreground">อุปกรณ์ของคุณ</p>
								{deviceTargets.map((target) => (
									<TargetTile
										key={target.id}
										target={target}
										active={selectedTargetIds.includes(target.id)}
										disabled={options.publicShare}
										onClick={() => toggleTarget(target.id)}
									/>
								))}
							</div>

							<div className="space-y-2">
								<p className="text-xs font-medium uppercase text-muted-foreground">เพื่อน</p>
								{friendTargets.map((target) => (
									<TargetTile
										key={target.id}
										target={target}
										active={selectedTargetIds.includes(target.id)}
										disabled={options.publicShare}
										onClick={() => toggleTarget(target.id)}
									/>
								))}
							</div>
						</div>
						<div
							className={cn(
								"pointer-events-none absolute inset-0 transition-opacity",
								options.publicShare
									? "bg-background/10 backdrop-blur-xs"
									: "bg-background/0 backdrop-blur-xs opacity-0",
							)}
						/>
					</ScrollArea>
					<div
						className={cn(
							"pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity",
							options.publicShare && "pointer-events-auto opacity-100",
						)}
					>
						การแชร์แบบสาธารณะไม่สามารถเลือกผู้รับได้
					</div>
				</section>

				<section className={cn("flex min-h-0 flex-col rounded-lg border bg-card transition-colors")}>
					<div className="flex items-center justify-between gap-3 border-b px-4 py-3">
						<div>
							<h2 className="font-medium">ไฟล์</h2>
							<p className="text-sm text-muted-foreground">เลือกไฟล์ที่ต้องการแชร์</p>
						</div>
						<Badge variant="secondary">
							{files.length} ไฟล์
							{totalSize > 0 ? ` · ${formatFileSize(totalSize)}` : null}
						</Badge>
					</div>
					<div
						data-drop-id="file-stage"
						data-drop-type="stage"
						className="relative flex min-h-0 flex-1 flex-col"
						onDragEnter={(event) => {
							event.preventDefault();
							setIsBrowserDraggingOverStage(true);
						}}
						onDragOver={(event) => {
							event.preventDefault();
							event.dataTransfer.dropEffect = "copy";
						}}
						onDragLeave={(event) => {
							if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
							setIsBrowserDraggingOverStage(false);
						}}
						onDrop={handleStageDrop}
					>
						<AnimatePresence>
							{showStageDropOverlay && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className={cn(
										"absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 border-2 border-dashed bg-black/30 transition-colors",
										isStageDropActive && "bg-black/60",
									)}
								>
									<LuPlus className="h-5 w-5 text-white/60" />
									<span className="text-sm text-white/60">
										{isStageDropActive ? "Release to add files" : "Drag files here"}
									</span>
								</motion.div>
							)}
						</AnimatePresence>
						<AnimatePresence initial={false} mode="wait">
							{files.length === 0 ? (
								<motion.div
									key="empty"
									layout
									initial={{ opacity: 0, scale: 0.98 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.98 }}
									transition={{ duration: 0.18 }}
									className="relative flex flex-1 flex-col items-center justify-center gap-2 text-center"
								>
									<div className="flex size-16 items-center justify-center rounded-full border border-dashed bg-muted">
										<LuFolderDown className="size-8 text-muted-foreground" />
									</div>
									<div className="max-w-sm space-y-1">
										<p className="font-medium">วางไฟล์ตรงนี้</p>
										<p className="text-sm text-muted-foreground">
											สามารถลากไฟล์ลงที่นี่เพื่ออัปโหลด หรือกดปุ่มด้านล่างเพื่อเลือกไฟล์
										</p>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => inputRef.current?.click()}
										>
											เลือกไฟล์
										</Button>
									</div>
								</motion.div>
							) : (
								<motion.div
									key="files"
									layout
									initial={{ opacity: 0, scale: 0.98 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.98 }}
									transition={{ duration: 0.18 }}
									className="min-h-0 flex-1"
								>
									<ScrollArea className="h-full">
										<motion.div layout className="space-y-2 px-4 py-2">
											<AnimatePresence initial={true} mode="popLayout">
												{files.map((file) => (
													<DraftFileRow
														key={file.id}
														file={file}
														onRemove={(id) =>
															setFiles((current) =>
																current.filter((item) => item.id !== id),
															)
														}
													/>
												))}
											</AnimatePresence>
										</motion.div>
									</ScrollArea>
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					<div className="p-4 border-t">
						<div className="space-y-4">
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<LuSettings2 className="size-4 text-muted-foreground" />
									<h2 className="font-medium">ตัวเลือกการส่ง</h2>
								</div>
								<div className="grid gap-3 sm:grid-cols-2">
									<label
										className={cn(
											"flex items-center justify-between gap-3 rounded-lg border p-3",
											options.publicShare && "opacity-60",
										)}
									>
										<span className="flex items-center gap-2 text-sm">
											<LuShieldCheck className="size-4 text-muted-foreground" />
											เข้ารหัส
										</span>
										<Switch
											checked={options.encrypt}
											disabled={options.publicShare}
											onCheckedChange={(encrypt) =>
												setOptions((current) => ({ ...current, encrypt }))
											}
										/>
									</label>
									<label className="flex items-center justify-between gap-3 rounded-lg border p-3">
										<span className="flex items-center gap-2 text-sm">
											<LuLink className="size-4 text-muted-foreground" />
											แชร์แบบสาธารณะ
										</span>
										<Switch
											checked={options.publicShare}
											onCheckedChange={handlePublicShareChange}
										/>
									</label>
								</div>
								<div
									className={cn(
										"grid transition-[grid-template-rows,opacity,margin-top] duration-200 ease-out",
										options.publicShare
											? "mt-3 grid-rows-[1fr] opacity-100"
											: "mt-0 grid-rows-[0fr] opacity-0",
									)}
								>
									<div className="min-h-0">
										<FieldGroup>
											<FieldSet>
												<Field>
													<FieldLabel
														htmlFor="public-share-password"
														className="flex items-center gap-2 text-sm"
													>
														รหัสผ่านสำหรับลิงก์สาธารณะ
													</FieldLabel>
													<Input
														id="public-share-password"
														type="password"
														value={options.password}
														placeholder="••••••••"
														onChange={(event) =>
															setOptions((current) => ({
																...current,
																password: event.target.value,
															}))
														}
														required
													/>
												</Field>
											</FieldSet>
										</FieldGroup>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
});

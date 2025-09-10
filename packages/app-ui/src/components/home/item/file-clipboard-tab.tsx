import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Tooltip, TooltipTrigger, TooltipContent } from "@workspace/ui/components/tooltip";
import { SearchInput } from "@workspace/ui/components/search-input";
import { cn } from "@workspace/ui/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import {
	Trash2,
	MoreHorizontal,
	RefreshCcw,
	Pin,
	PinOff,
	Eye,
	FileImage,
	FileText,
	FileArchive,
	FileAudio,
	FileVideo,
	File,
	Search,
} from "lucide-react";
import { LiaBroomSolid } from "react-icons/lia";
import { MdDeselect, MdSelectAll } from "react-icons/md";
import { FileItem } from "@workspace/app-ui/hooks/use-file-clipboard";
import { formatBytes, formatDate } from "@workspace/app-ui/libs/utils";

function KindIcon({ kind }: { kind: FileItem["kind"] }) {
	switch (kind) {
		case "image":
			return <FileImage className="w-4 h-4" />;
		case "text":
			return <FileText className="w-4 h-4" />;
		case "archive":
			return <FileArchive className="w-4 h-4" />;
		case "audio":
			return <FileAudio className="w-4 h-4" />;
		case "video":
			return <FileVideo className="w-4 h-4" />;
		default:
			return <File className="w-4 h-4" />;
	}
}

export function FileClipboardTab({
	files,
	loading,
	onReload,
	onDelete,
	onBulkDelete,
	onClearAll,
	onTogglePin,
	onOpenView,
}: {
	files: FileItem[];
	loading: boolean;
	onReload: () => void;
	onDelete: (id: number) => Promise<boolean>;
	onBulkDelete: (ids: number[]) => Promise<boolean>;
	onClearAll: () => void;
	onTogglePin: (id: number) => void;
	onOpenView: (item: FileItem) => void;
}) {
	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const deferredQuery = React.useDeferredValue(query);

	const [selected, setSelected] = React.useState<Set<number>>(new Set());
	const [deleting, setDeleting] = React.useState<Set<number>>(new Set());
	const [pinning, setPinning] = React.useState<Set<number>>(new Set());

	const filtered = React.useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		if (!q) return files;
		return files.filter((f) => f.name.toLowerCase().includes(q));
	}, [files, deferredQuery]);

	const sorted = React.useMemo(() => {
		return [...filtered].sort((a, b) => {
			if (a.pinned && !b.pinned) return -1;
			if (!a.pinned && b.pinned) return 1;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	}, [filtered]);

	const isSelectionMode = selected.size > 0;
	const allSelected = sorted.length > 0 && selected.size === sorted.length;

	const handleRefresh = React.useCallback(async () => {
		setIsRefreshing(true);
		try {
			await onReload();
		} finally {
			setTimeout(() => setIsRefreshing(false), 500);
		}
	}, [onReload]);

	const clearSearch = React.useCallback(() => setQuery(""), []);
	const toggleSelection = (id: number) =>
		setSelected((prev) => {
			const n = new Set(prev);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	const toggleSelectAll = () =>
		setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((x) => x.id))));
	const clearSelection = () => setSelected(new Set());

	return (
		<Card className="h-full">
			<CardHeader className="flex items-start justify-between">
				<div className="space-y-1 flex-1">
					<CardTitle className="flex items-center gap-2">ไฟล์</CardTitle>
					<CardDescription>
						{query
							? `Found ${sorted.length} files for “${query}”.`
							: isSelectionMode
								? `${selected.size} file(s) selected.`
								: `ไฟล์ของคุณที่เคยดาวน์โหลดไว้ จะแสดงตรงนี้!`}
					</CardDescription>
				</div>

				<div className="flex items-center gap-2">
					<AnimatePresence>
						{isSelectionMode && (
							<motion.div
								initial={{ opacity: 0, x: 20 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 20 }}
								className="flex items-center gap-2"
							>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant="destructive"
											size="sm"
											onClick={async () => {
												setDeleting(selected);
												const ok = await onBulkDelete(Array.from(selected));

												if (!ok) {
													setDeleting(new Set());
												}
											}}
											className="gap-2"
										>
											<Trash2 /> {selected.size}
										</Button>
									</TooltipTrigger>
									<TooltipContent>Delete selected</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button variant="outline" size="sm" onClick={clearSelection}>
											<LiaBroomSolid />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Clear selection</TooltipContent>
								</Tooltip>
							</motion.div>
						)}
					</AnimatePresence>

					<SearchInput searchQuery={query} onSearchQuery={setQuery} onClearSearch={clearSearch} />

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="sm">
								<MoreHorizontal className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
								<RefreshCcw className={cn("mr-2", isRefreshing && "animate-spin")} />
								Refresh
							</DropdownMenuItem>
							{sorted.length > 0 && (
								<>
									<DropdownMenuItem onClick={toggleSelectAll}>
										{allSelected ? (
											<>
												<MdDeselect className="mr-2" /> Deselect all
											</>
										) : (
											<>
												<MdSelectAll className="mr-2" /> Select all
											</>
										)}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={onClearAll}
										className="text-destructive focus:text-destructive"
									>
										<Trash2 className="mr-2" /> Clear all
									</DropdownMenuItem>
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardHeader>

			<CardContent>
				{sorted.length > 0 ? (
					<ScrollArea className="h-[calc(100vh-16rem)]">
						<div className={isSelectionMode ? "space-y-3" : "space-y-2"}>
							<AnimatePresence mode="popLayout">
								{sorted.map((f) => {
									const isDeleting = deleting.has(f.id);
									const isPinning = pinning.has(f.id);
									const isSelected = selected.has(f.id);

									return (
										<motion.div
											key={f.id}
											layout
											initial={{ opacity: 0, y: 20 }}
											animate={{
												opacity: isDeleting ? 0.5 : 1,
												y: 0,
												scale: isDeleting ? 0.98 : 1,
											}}
											exit={{ opacity: 0, scale: 0.96, height: 0, marginBottom: 0 }}
											transition={{
												duration: 0.18,
												ease: "easeInOut",
												layout: { duration: 0.25 },
											}}
										>
											<div
												className={cn(
													"group transition-all duration-200 border border-l-4 hover:shadow-md rounded-md bg-card",
													f.pinned
														? "border-l-primary bg-amber-50/50 dark:bg-primary/10"
														: "border-l-muted-foreground/20",
													isSelected && "ring-1 ring-primary ring-offset-1 m-1",
													isDeleting ? "pointer-events-none opacity-50" : "cursor-default"
												)}
											>
												<div className="p-4">
													<div className="flex items-start gap-3">
														<div className="flex items-center pt-1">
															<Checkbox
																checked={isSelected}
																onCheckedChange={() => toggleSelection(f.id)}
																className="data-[state=checked]:bg-primary"
															/>
														</div>

														<div className="flex-1 min-w-0 space-y-3">
															<div className="flex items-start justify-between gap-2">
																<div className="min-w-0 space-y-2">
																	<div className="flex items-center gap-2">
																		<KindIcon kind={f.kind} />
																		<p className="text-sm font-medium truncate">
																			{f.name}
																		</p>
																	</div>
																	<div className="text-xs text-muted-foreground mt-1">
																		{formatBytes(f.size)} •{" "}
																		{formatDate(f.createdAt)}
																	</div>
																</div>

																{f.pinned && (
																	<Badge
																		variant="secondary"
																		className="gap-1 text-xs"
																	>
																		<Pin className="w-3 h-3" /> Pinned
																	</Badge>
																)}
															</div>

															<div className="flex items-center gap-2">
																<Badge variant="outline" className="text-xs uppercase">
																	{f.kind}
																</Badge>
															</div>
														</div>
													</div>

													<div className="mt-2 flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => onOpenView(f)}
																>
																	<Eye className="w-4 h-4" />
																</Button>
															</TooltipTrigger>
															<TooltipContent>Preview</TooltipContent>
														</Tooltip>

														{/* <Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		setPinning((s) => new Set(s).add(f.id));
																		onTogglePin(f.id);
																		setTimeout(
																			() =>
																				setPinning((s) => {
																					const n = new Set(s);
																					n.delete(f.id);
																					return n;
																				}),
																			400
																		);
																	}}
																>
																	{isPinning ? (
																		<RefreshCcw className="w-4 h-4 animate-spin" />
																	) : f.pinned ? (
																		<PinOff className="w-4 h-4" />
																	) : (
																		<Pin className="w-4 h-4" />
																	)}
																</Button>
															</TooltipTrigger>
															<TooltipContent>
																{f.pinned ? "Unpin" : "Pin"}
															</TooltipContent>
														</Tooltip> */}

														<Tooltip>
															<TooltipTrigger asChild>
																<Button
																	variant="destructive"
																	size="sm"
																	onClick={async () => {
																		// setDeleting((s) => new Set(s).add(f.id));
																		// onDelete(f.id);
																		// setTimeout(
																		// 	() =>
																		// 		setDeleting((s) => {
																		// 			const n = new Set(s);
																		// 			n.delete(f.id);
																		// 			return n;
																		// 		}),
																		// 	400
																		// );
																		setDeleting((s) => new Set(s).add(f.id)); // scale 0.99 via isDeleting
																		const ok = await onDelete(f.id); // <-- wait for dialog result
																		if (!ok) {
																			// user canceled: restore immediately
																			setDeleting((s) => {
																				const n = new Set(s);
																				n.delete(f.id);
																				return n;
																			});
																		}
																	}}
																>
																	{isDeleting ? (
																		<RefreshCcw className="w-4 h-4 animate-spin" />
																	) : (
																		<Trash2 className="w-4 h-4" />
																	)}
																</Button>
															</TooltipTrigger>
															<TooltipContent>Delete</TooltipContent>
														</Tooltip>
													</div>
												</div>
											</div>
										</motion.div>
									);
								})}
							</AnimatePresence>
						</div>
					</ScrollArea>
				) : (
					<div
						className={cn(
							"h-[calc(100vh-18rem)] flex flex-col items-center justify-center",
							"border-2 border-dashed rounded-lg text-muted-foreground space-y-4"
						)}
					>
						{loading ? (
							<>
								<RefreshCcw className="w-8 h-8 animate-spin mb-2" />
								<p>Loading files…</p>
							</>
						) : query ? (
							<>
								<Search className="w-8 h-8 mb-2" />
								<p className="text-center">No files for “{query}”.</p>
								<Button variant="outline" onClick={clearSearch} size="sm">
									Clear search
								</Button>
							</>
						) : (
							<>
								<File className="w-8 h-8 mb-2" />
								<p>No files yet</p>
								<p className="text-xs text-center max-w-xs">Upload or drop a file to keep it handy.</p>
							</>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

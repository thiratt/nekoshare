// components/TextClipboardTab.tsx
import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
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
import { Trash2, MoreHorizontal, RefreshCcw, Pin, Eye, PinOff, Search, Copy } from "lucide-react";
import { LiaBroomSolid } from "react-icons/lia";
import { MdDeselect, MdSelectAll } from "react-icons/md";
import { ClipboardItem } from "@workspace/app-ui/hooks/use-text-clipboard";
import { CONTENT_PREVIEW_LENGTH, getTextContentType, truncate, formatDate } from "@workspace/app-ui/libs/utils";

export function TextClipboardTab({
	items,
	loading,
	onReload,
	onDelete,
	onBulkDelete,
	onClearAll,
	onTogglePin,
	onCopy,
	onOpenView,
}: {
	items: ClipboardItem[];
	loading: boolean;
	onReload: () => void;
	onDelete: (id: number) => Promise<boolean>;
	onBulkDelete: (ids: number[]) => Promise<boolean>;
	onClearAll: () => void;
	onTogglePin: (id: number) => void;
	onCopy: (text: string) => void;
	onOpenView: (item: ClipboardItem) => void;
}) {
	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const deferredQuery = React.useDeferredValue(query);

	const [selected, setSelected] = React.useState<Set<number>>(new Set());
	const [deleting, setDeleting] = React.useState<Set<number>>(new Set());
	const [pinning, setPinning] = React.useState<Set<number>>(new Set());

	const filtered = React.useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		if (!q) return items;
		return items.filter((it) => it.content.toLowerCase().includes(q));
	}, [items, deferredQuery]);

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
			onReload();
		} finally {
			setTimeout(() => setIsRefreshing(false), 500);
		}
	}, [onReload]);

	const clearSearch = React.useCallback(() => setQuery(""), []);

	const toggleSelection = (id: number) =>
		setSelected((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});

	const toggleSelectAll = () =>
		setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((x) => x.id))));
	const clearSelection = () => setSelected(new Set());

	return (
		<Card className="h-full">
			<CardHeader className="flex items-start justify-between">
				<div className="space-y-1 flex-1">
					<CardTitle className="flex items-center gap-2">ข้อความ</CardTitle>
					<CardDescription>
						{query
							? `Found ${sorted.length} results for “${query}”.`
							: isSelectionMode
								? `${selected.size} item(s) selected.`
								: `ข้อความของคุณที่เคยดาวน์โหลดไว้ จะแสดงตรงนี้!`}
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
										<Trash2 className="mr-2" />
										Clear all
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
								{sorted.map((item) => {
									const { id, content, createdAt, pinned } = item;
									const isDeleting = deleting.has(id);
									const isPinning = pinning.has(id);
									const isSelected = selected.has(id);
									const isLong = content.length > CONTENT_PREVIEW_LENGTH;
									const ct = getTextContentType(content);

									return (
										<motion.div
											key={id}
											layout
											initial={{ opacity: 0, y: 20 }}
											animate={{
												opacity: isDeleting ? 0.5 : 1,
												y: 0,
												scale: isDeleting ? 0.99 : 1,
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
													pinned && "border-l-primary bg-amber-50/50 dark:bg-primary/10",
													isSelected && "ring-1 ring-primary ring-offset-1 m-1",
													isDeleting
														? "pointer-events-none opacity-50 border-primary"
														: "cursor-pointer hover:bg-accent/50"
												)}
												onClick={() => !isDeleting && onCopy(content)}
												role="button"
												tabIndex={0}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														!isDeleting && onCopy(content);
													}
												}}
												aria-label={pinned ? "Pinned clipboard item" : "Clipboard item"}
											>
												<div className="p-4">
													<div className="flex items-start gap-3">
														<div className="flex items-center pt-1">
															<Checkbox
																checked={isSelected}
																onCheckedChange={() =>
																	setSelected((s) => {
																		const n = new Set(s);
																		n.has(id) ? n.delete(id) : n.add(id);
																		return n;
																	})
																}
																className="data-[state=checked]:bg-primary"
																onClick={(e) => e.stopPropagation()}
																aria-label={
																	isSelected ? "Unselect item" : "Select item"
																}
															/>
														</div>

														<div className="flex-1 min-w-0 space-y-2">
															<div className="flex items-start justify-between gap-2">
																<div className="flex-1">
																	<p className="text-sm whitespace-pre-line line-clamp-3 leading-relaxed">
																		{truncate(content)}
																	</p>
																	{isLong && (
																		<p className="text-xs text-muted-foreground mt-1">
																			ข้อความยาวเกินไป ตัดหรือดูเพิ่มเติม
																			เพื่อเข้าถึงข้อความแบบเต็ม
																		</p>
																	)}
																</div>
																{/* {pinned && (
																	<Badge
																		variant="secondary"
																		className="gap-1 text-xs"
																	>
																		<Pin className="w-3 h-3" /> ปักหมุด
																	</Badge>
																)} */}
															</div>

															<div className="flex items-center gap-2">
																<Badge variant="outline" className="text-xs">
																	{ct}
																</Badge>
																<span className="text-xs text-muted-foreground">
																	{content.length} ตัวอักษร
																</span>
															</div>
														</div>
													</div>

													<div className="mt-2 flex justify-between items-center">
														<span className="text-sm text-muted-foreground">
															{formatDate(createdAt)}
														</span>
														<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={(e) => {
																			e.stopPropagation();
																			onOpenView(item);
																		}}
																	>
																		<Eye className="w-4 h-4" />
																	</Button>
																</TooltipTrigger>
																<TooltipContent>View</TooltipContent>
															</Tooltip>
															{/* <Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={(e) => {
																			e.stopPropagation();
																			setPinning((s) => new Set(s).add(id));
																			onTogglePin(id);
																			setTimeout(
																				() =>
																					setPinning((s) => {
																						const n = new Set(s);
																						n.delete(id);
																						return n;
																					}),
																				400
																			);
																		}}
																	>
																		{isPinning ? (
																			<RefreshCcw className="w-4 h-4 animate-spin" />
																		) : pinned ? (
																			<PinOff className="w-4 h-4" />
																		) : (
																			<Pin className="w-4 h-4" />
																		)}
																	</Button>
																</TooltipTrigger>
																<TooltipContent>
																	{pinned ? "Unpin" : "Pin"}
																</TooltipContent>
															</Tooltip> */}
															<Tooltip>
																<TooltipTrigger asChild>
																	<Button
																		variant="destructive"
																		size="sm"
																		onClick={async (e) => {
																			e.stopPropagation();
																			setDeleting((s) => new Set(s).add(id)); // scale 0.99 via isDeleting
																			const ok = await onDelete(id); // <-- wait for dialog result
																			if (!ok) {
																				// user canceled: restore immediately
																				setDeleting((s) => {
																					const n = new Set(s);
																					n.delete(id);
																					return n;
																				});
																			}
																			// if ok === true the parent will remove the item -> AnimatePresence handles exit

																			// e.stopPropagation();
																			// setDeleting((s) => new Set(s).add(id));
																			// onDelete(id);
																			// // setTimeout(
																			// // 	() =>
																			// // 		setDeleting((s) => {
																			// // 			const n = new Set(s);
																			// // 			n.delete(id);
																			// // 			return n;
																			// // 		}),
																			// // 	400
																			// // );
																		}}
																	>
																		{/* {deleting.has(id) ? (
																			<RefreshCcw className="w-4 h-4 animate-spin" />
																		) : (
																			<Trash2 className="w-4 h-4" />
																		)} */}
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
								<p>Loading items…</p>
							</>
						) : query ? (
							<>
								<Search className="w-8 h-8 mb-2" />
								<p className="text-center">No results for “{query}”.</p>
								<Button variant="outline" onClick={clearSearch} size="sm">
									Clear search
								</Button>
							</>
						) : (
							<>
								<Copy className="w-8 h-8 mb-2" />
								<p>No items yet</p>
								<p className="text-xs text-center max-w-xs">
									Copy any text and it will appear here for quick reuse.
								</p>
							</>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

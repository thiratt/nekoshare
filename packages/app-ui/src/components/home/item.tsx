import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@workspace/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from "@workspace/ui/components/dropdown-menu";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { SearchInput } from "@workspace/ui/components/search-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { Trash2, MoreHorizontal, RefreshCcw, Pin, Eye, PinOff, Search, Copy, ClipboardCopy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as React from "react";
import { LiaBroomSolid } from "react-icons/lia";
import { MdDeselect, MdSelectAll } from "react-icons/md";

// ------------------------------------------------------------
// Constants & Types
// ------------------------------------------------------------
const CONTENT_PREVIEW_LENGTH = 150;

interface ClipboardItem {
	id: number;
	content: string;
	pinned: boolean;
	createdAt: string; // ISO string
}

// ------------------------------------------------------------
// Fake data layer (replace with your real data source)
// ------------------------------------------------------------
function useClipboard() {
	const [clipboardItems, setClipboardItems] = React.useState<ClipboardItem[]>([]);
	const [isLoading, setIsLoading] = React.useState(false);

	React.useEffect(() => {
		setIsLoading(true);
		const timer = setTimeout(() => {
			const now = new Date();
			const mockData: ClipboardItem[] = [
				{ id: 1, content: "Welcome to your clipboard.", pinned: false, createdAt: now.toISOString() },
				{
					id: 2,
					content: "https://example.com/docs",
					pinned: true,
					createdAt: new Date(now.getTime() - 1000 * 60).toISOString(),
				},
				{
					id: 3,
					content: "import x from 'y';\nexport const z = 1;",
					pinned: false,
					createdAt: new Date(now.getTime() - 1000 * 120).toISOString(),
				},
			];
			setClipboardItems(mockData);
			setIsLoading(false);
		}, 400);
		return () => clearTimeout(timer);
	}, []);

	const reload = React.useCallback(async () => {
		setIsLoading(true);
		const timer = setTimeout(() => {
			const now = new Date();
			setClipboardItems([
				{
					id: Math.floor(Math.random() * 10_000),
					content: "New item from refresh",
					pinned: false,
					createdAt: now.toISOString(),
				},
			]);
			setIsLoading(false);
		}, 300);
		return () => clearTimeout(timer);
	}, []);

	const deleteItem = React.useCallback((id: number) => {
		setClipboardItems((items) => items.filter((it) => it.id !== id));
	}, []);

	const bulkDelete = React.useCallback((ids: number[]) => {
		setClipboardItems((items) => items.filter((it) => !ids.includes(it.id)));
	}, []);

	const clearAll = React.useCallback(() => {
		setClipboardItems([]);
	}, []);

	const togglePin = React.useCallback((id: number) => {
		setClipboardItems((items) => items.map((it) => (it.id === id ? { ...it, pinned: !it.pinned } : it)));
	}, []);

	const pinnedItems = React.useMemo(() => clipboardItems.filter((it) => it.pinned), [clipboardItems]);
	const unpinnedItems = React.useMemo(() => clipboardItems.filter((it) => !it.pinned), [clipboardItems]);

	return {
		clipboardItems,
		pinnedItems,
		unpinnedItems,
		isLoading,
		reload,
		deleteItem,
		bulkDelete,
		clearAll,
		togglePin,
	};
}

// ------------------------------------------------------------
// UI Component
// ------------------------------------------------------------
export function ItemUI(): React.JSX.Element {
	const { clipboardItems, isLoading, reload, deleteItem, bulkDelete, clearAll, togglePin } = useClipboard();

	const [isRefreshing, setIsRefreshing] = React.useState(false);
	const [query, setQuery] = React.useState("");
	const deferredQuery = React.useDeferredValue(query);

	const [selectedItems, setSelectedItems] = React.useState<Set<number>>(new Set());
	const [deletingItems, setDeletingItems] = React.useState<Set<number>>(new Set());
	const [pinningItems, setPinningItems] = React.useState<Set<number>>(new Set());
	const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; itemId: number | null; isBulk: boolean }>(
		{ open: false, itemId: null, isBulk: false }
	);
	const [clearAllConfirm, setClearAllConfirm] = React.useState(false);
	const [viewDialog, setViewDialog] = React.useState<{ open: boolean; item: ClipboardItem | null }>({
		open: false,
		item: null,
	});

	// Derived
	const filteredItems = React.useMemo(() => {
		const q = deferredQuery.trim().toLowerCase();
		if (!q) return clipboardItems;
		return clipboardItems.filter((it) => it.content.toLowerCase().includes(q));
	}, [clipboardItems, deferredQuery]);

	const sortedItems = React.useMemo(() => {
		return [...filteredItems].sort((a, b) => {
			if (a.pinned && !b.pinned) return -1;
			if (!a.pinned && b.pinned) return 1;
			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	}, [filteredItems]);

	const isSelectionMode = selectedItems.size > 0;
	const allSelected = sortedItems.length > 0 && selectedItems.size === sortedItems.length;

	// Handlers
	const handleCopy = React.useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			// optional toast
		} catch (err) {
			console.error("Copy failed", err);
		}
	}, []);

	const handleRefresh = React.useCallback(async () => {
		setIsRefreshing(true);
		try {
			await reload();
		} finally {
			setTimeout(() => setIsRefreshing(false), 500);
		}
	}, [reload]);

	const clearSearch = React.useCallback(() => setQuery(""), []);

	const toggleItemSelection = React.useCallback((id: number) => {
		setSelectedItems((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}, []);

	const toggleSelectAll = React.useCallback(() => {
		setSelectedItems((prev) => {
			if (sortedItems.length === 0) return new Set();
			if (prev.size === sortedItems.length) return new Set();
			return new Set(sortedItems.map((it) => it.id));
		});
	}, [sortedItems]);

	const clearSelection = React.useCallback(() => setSelectedItems(new Set()), []);

	const handleTogglePin = React.useCallback(
		(id: number) => {
			setPinningItems((prev) => new Set(prev).add(id));
			try {
				togglePin(id);
			} finally {
				setPinningItems((prev) => {
					const next = new Set(prev);
					next.delete(id);
					return next;
				});
			}
		},
		[togglePin]
	);

	const handleDeleteClick = React.useCallback(
		(itemId: number) => setDeleteConfirm({ open: true, itemId, isBulk: false }),
		[]
	);
	const handleBulkDeleteClick = React.useCallback(
		() => setDeleteConfirm({ open: true, itemId: null, isBulk: true }),
		[]
	);

	const handleDeleteConfirm = React.useCallback(async () => {
		const { itemId, isBulk } = deleteConfirm;
		if (isBulk) {
			const ids = Array.from(selectedItems);
			setDeletingItems(new Set(ids));
			try {
				await bulkDelete(ids);
				setSelectedItems(new Set());
			} finally {
				setDeletingItems(new Set());
			}
		} else if (itemId != null) {
			setDeletingItems(new Set([itemId]));
			try {
				await deleteItem(itemId);
			} finally {
				setDeletingItems(new Set());
			}
		}
		setDeleteConfirm({ open: false, itemId: null, isBulk: false });
	}, [bulkDelete, deleteConfirm, deleteItem, selectedItems]);

	const handleClearAll = React.useCallback(() => setClearAllConfirm(true), []);

	const handleClearAllConfirm = React.useCallback(async () => {
		try {
			await clearAll();
		} finally {
			setClearAllConfirm(false);
		}
	}, [clearAll]);

	const handleViewMore = React.useCallback((item: ClipboardItem) => setViewDialog({ open: true, item }), []);

	const truncateText = React.useCallback(
		(text: string, max: number = CONTENT_PREVIEW_LENGTH) => (text.length > max ? `${text.slice(0, max)}…` : text),
		[]
	);

	const getContentType = React.useCallback((content: string) => {
		if (content.startsWith("http")) return "URL";
		if (content.includes("import ") && content.includes("export")) return "Code";
		if (content.includes("") && content.length > 100) return "Text";
		return "Text";
	}, []);

	const tabContentAnimate = React.useMemo(
		() =>
			cn(
				"data-[state='active']:animate-in data-[state='active']:fade-in data-[state='active']:zoom-in-[.97] data-[state='active']:slide-in-from-bottom-1 data-[state='active']:duration-300",
				"data-[state='inactive']:animate-out data-[state='inactive']:fade-out data-[state='inactive']:zoom-out-[.97] data-[state='inactive']:slide-out-to-bottom-1 data-[state='inactive']:duration-100"
			),
		[]
	);

	return (
		<div>
			<Tabs defaultValue="text">
				<TabsList className="bg-background gap-1">
					<TabsTrigger
						className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
						value="text"
					>
						Text
					</TabsTrigger>
					<TabsTrigger
						className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
						value="file"
					>
						Files
					</TabsTrigger>
				</TabsList>

				<TabsContent className={tabContentAnimate} value="text">
					<Card>
						<CardHeader className="flex items-start justify-between">
							<div className="space-y-1 flex-1">
								<CardTitle className="flex items-center gap-2">Clipboard</CardTitle>
								<CardDescription>
									{query
										? `Found ${sortedItems.length} results for “${query}”.`
										: isSelectionMode
											? `${selectedItems.size} item(s) selected.`
											: `Your recent snippets, links and code.`}
								</CardDescription>
							</div>

							<div className="flex items-center gap-2">
								{/* Selection Mode Controls */}
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
														aria-label="Delete selected"
														title="Delete selected"
														variant="destructive"
														size="sm"
														onClick={handleBulkDeleteClick}
														className="gap-2"
													>
														<Trash2 />
														{selectedItems.size}
													</Button>
												</TooltipTrigger>
												<TooltipContent>Delete selected</TooltipContent>
											</Tooltip>

											<Tooltip>
												<TooltipTrigger asChild>
													<Button
														aria-label="Clear selection"
														title="Clear selection"
														variant="outline"
														size="sm"
														onClick={clearSelection}
													>
														<LiaBroomSolid />
													</Button>
												</TooltipTrigger>
												<TooltipContent>Clear selection</TooltipContent>
											</Tooltip>
										</motion.div>
									)}
								</AnimatePresence>

								{/* Search */}
								<SearchInput searchQuery={query} onSearchQuery={setQuery} onClearSearch={clearSearch} />

								{/* Actions Menu */}
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button aria-label="More actions" variant="outline" size="sm">
											<MoreHorizontal className="w-4 h-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
											<RefreshCcw className={cn("mr-2", isRefreshing && "animate-spin")} />
											Refresh
										</DropdownMenuItem>
										{sortedItems.length > 0 && (
											<>
												<DropdownMenuItem onClick={toggleSelectAll}>
													{allSelected ? (
														<>
															<MdDeselect className="mr-2" />
															Deselect all
														</>
													) : (
														<>
															<MdSelectAll className="mr-2" />
															Select all
														</>
													)}
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={handleClearAll}
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
							{sortedItems.length > 0 ? (
								<ScrollArea className="h-[calc(100vh-18rem)]">
									<div className={isSelectionMode ? "space-y-3" : "space-y-2"}>
										<AnimatePresence mode="popLayout">
											{sortedItems.map((item) => {
												const { id, content, createdAt, pinned } = item;
												const isDeleting = deletingItems.has(id);
												const isPinning = pinningItems.has(id);
												const isSelected = selectedItems.has(id);
												const isLong = content.length > CONTENT_PREVIEW_LENGTH;
												const contentType = getContentType(content);

												return (
													<motion.div
														key={id}
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
														<Card
															className={cn(
																"group transition-all duration-200 border-l-4 hover:shadow-md",
																pinned
																	? "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
																	: "border-l-muted-foreground/20 bg-card",
																isSelected && "ring-1 ring-primary ring-offset-1 m-1",
																isDeleting
																	? "pointer-events-none opacity-50"
																	: "cursor-pointer hover:bg-accent/50"
															)}
															onClick={() =>
																!isDeleting && !isSelectionMode && handleCopy(content)
															}
															role="button"
															tabIndex={0}
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	e.preventDefault();
																	!isDeleting &&
																		!isSelectionMode &&
																		handleCopy(content);
																}
															}}
															aria-label={
																pinned ? "Pinned clipboard item" : "Clipboard item"
															}
														>
															<CardHeader className="pb-2">
																<div className="flex items-start gap-3">
																	{/* Selection Checkbox */}
																	<div className="flex items-center pt-1">
																		<Checkbox
																			checked={isSelected}
																			onCheckedChange={() =>
																				toggleItemSelection(id)
																			}
																			className="data-[state=checked]:bg-primary"
																			onClick={(e) => e.stopPropagation()}
																			aria-label={
																				isSelected
																					? "Unselect item"
																					: "Select item"
																			}
																		/>
																	</div>

																	{/* Content */}
																	<div className="flex-1 min-w-0 space-y-2">
																		<div className="flex items-start justify-between gap-2">
																			<div className="flex-1">
																				<p className="text-sm whitespace-pre-line line-clamp-3 leading-relaxed">
																					{truncateText(content)}
																				</p>
																				{isLong && (
																					<p className="text-xs text-muted-foreground mt-1">
																						Truncated preview - copy or open
																						to view more.
																					</p>
																				)}
																			</div>

																			{/* Pin Badge */}
																			{pinned && (
																				<Badge
																					variant="secondary"
																					className="gap-1 text-xs"
																				>
																					<Pin className="w-3 h-3" />
																					Pinned
																				</Badge>
																			)}
																		</div>

																		{/* Meta */}
																		<div className="flex items-center gap-2">
																			<Badge
																				variant="outline"
																				className="text-xs"
																			>
																				{contentType}
																			</Badge>
																			<span className="text-xs text-muted-foreground">
																				{content.length} characters
																			</span>
																		</div>
																	</div>
																</div>
															</CardHeader>

															<CardFooter className="flex justify-between items-center">
																<span className="text-sm text-muted-foreground">
																	{new Date(createdAt).toLocaleString()}
																</span>

																<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				aria-label="View more"
																				variant="outline"
																				size="sm"
																				onClick={(e) => {
																					e.stopPropagation();
																					handleViewMore(item);
																				}}
																				disabled={isDeleting}
																			>
																				<Eye className="w-4 h-4" />
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>View</TooltipContent>
																	</Tooltip>

																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				aria-label={pinned ? "Unpin" : "Pin"}
																				variant="outline"
																				size="sm"
																				onClick={(e) => {
																					e.stopPropagation();
																					handleTogglePin(id);
																				}}
																				disabled={isDeleting || isPinning}
																				className={cn(
																					pinned &&
																						"bg-amber-100 hover:bg-amber-200 dark:bg-amber-950 dark:hover:bg-amber-900"
																				)}
																			>
																				{isPinning ? (
																					<motion.div
																						animate={{ rotate: 360 }}
																						transition={{
																							duration: 1,
																							repeat: Infinity,
																							ease: "linear",
																						}}
																					>
																						<RefreshCcw className="w-4 h-4" />
																					</motion.div>
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
																	</Tooltip>

																	<Tooltip>
																		<TooltipTrigger asChild>
																			<Button
																				aria-label="Delete"
																				variant="destructive"
																				size="sm"
																				onClick={(e) => {
																					e.stopPropagation();
																					handleDeleteClick(id);
																				}}
																				disabled={isDeleting}
																			>
																				{isDeleting ? (
																					<motion.div
																						animate={{ rotate: 360 }}
																						transition={{
																							duration: 1,
																							repeat: Infinity,
																							ease: "linear",
																						}}
																					>
																						<RefreshCcw className="w-4 h-4" />
																					</motion.div>
																				) : (
																					<Trash2 className="w-4 h-4" />
																				)}
																			</Button>
																		</TooltipTrigger>
																		<TooltipContent>Delete</TooltipContent>
																	</Tooltip>
																</div>
															</CardFooter>
														</Card>
													</motion.div>
												);
											})}
										</AnimatePresence>
									</div>
								</ScrollArea>
							) : (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className={cn(
										"h-[calc(100vh-18rem)] flex flex-col items-center justify-center",
										"border-2 border-dashed rounded-lg text-muted-foreground space-y-4"
									)}
								>
									{isLoading ? (
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
								</motion.div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent className={tabContentAnimate} value="file">
					<Card>
						<CardHeader>
							<CardTitle>Files</CardTitle>
							<CardDescription>File clipboard coming soon.</CardDescription>
						</CardHeader>
					</Card>
				</TabsContent>
			</Tabs>

			{/* View content dialog */}
			<Dialog
				open={viewDialog.open}
				onOpenChange={(o) => setViewDialog({ open: o, item: o ? viewDialog.item : null })}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Clipboard item</DialogTitle>
						<DialogDescription>Full content preview and quick actions.</DialogDescription>
					</DialogHeader>
					{viewDialog.item && (
						<div className="space-y-4">
							<div className="flex items-center justify-between text-sm text-muted-foreground">
								<span>{new Date(viewDialog.item.createdAt).toLocaleString()}</span>
								<div className="flex items-center gap-2">
									<Badge variant="outline">{getContentType(viewDialog.item.content)}</Badge>
									<span>{viewDialog.item.content.length} characters</span>
								</div>
							</div>
							<ScrollArea className="max-h-[60vh] rounded border p-3 bg-muted/30">
								<pre className="whitespace-pre-wrap text-sm leading-6">{viewDialog.item.content}</pre>
							</ScrollArea>
							<div className="flex items-center justify-end gap-2">
								<Button variant="outline" onClick={() => handleCopy(viewDialog.item!.content)}>
									<ClipboardCopy className="w-4 h-4 mr-2" /> Copy
								</Button>
								<Button variant="secondary" onClick={() => setViewDialog({ open: false, item: null })}>
									Close
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Delete confirm dialog */}
			<AlertDialog
				open={deleteConfirm.open}
				onOpenChange={(o) => setDeleteConfirm((prev) => ({ ...prev, open: o }))}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{deleteConfirm.isBulk
								? `Delete ${selectedItems.size} selected item(s)?`
								: "Delete this item?"}
						</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => setDeleteConfirm({ open: false, itemId: null, isBulk: false })}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Clear all confirm dialog */}
			<AlertDialog open={clearAllConfirm} onOpenChange={setClearAllConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear all items?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove all clipboard items. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleClearAllConfirm}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Clear all
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

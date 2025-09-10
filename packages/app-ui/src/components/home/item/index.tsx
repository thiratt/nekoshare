// ItemUI.tsx
import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tab-animate";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
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
import { cn } from "@workspace/ui/lib/utils";

import { useTextClipboard, ClipboardItem } from "@workspace/app-ui/hooks/use-text-clipboard";
import { useFileClipboard, FileItem } from "@workspace/app-ui/hooks/use-file-clipboard";
import { TextClipboardTab } from "./text-clipboard-tab";
import { FileClipboardTab } from "./file-clipboard-tab";
import { ViewTextDialog } from "./view-text-dialog";
import { ViewFileDialog } from "./view-file-dialog";
// import { StorageUsageInline } from "./storage-usage";

type DeleteMode = "text" | "file";

export function ItemUI(): React.JSX.Element {
	// text
	const text = useTextClipboard();
	// files
	const files = useFileClipboard();

	const [tab, setTab] = React.useState<"text" | "file">("text");

	// dialogs & confirms (shared)
	const [viewText, setViewText] = React.useState<{ open: boolean; item: ClipboardItem | null }>({
		open: false,
		item: null,
	});
	const [viewFile, setViewFile] = React.useState<{ open: boolean; item: FileItem | null }>({
		open: false,
		item: null,
	});

	const [deleteConfirm, setDeleteConfirm] = React.useState<{
		open: boolean;
		ids: number[];
		mode: DeleteMode;
		resolve?: (ok: boolean) => void; // <-- resolver
	}>({ open: false, ids: [], mode: "text" });

	const [clearAllConfirm, setClearAllConfirm] = React.useState<{ open: boolean; mode: "text" | "file" }>({
		open: false,
		mode: "text",
	});

	const tabContentAnimate = React.useMemo(
		() => cn(),
		// "data-[state='active']:animate-in data-[state='active']:fade-in data-[state='active']:zoom-in-[.97] data-[state='active']:slide-in-from-bottom-1 data-[state='active']:duration-300",
		// "data-[state='inactive']:animate-out data-[state='inactive']:fade-out data-[state='inactive']:zoom-out-[.97] data-[state='inactive']:slide-out-to-bottom-1 data-[state='inactive']:duration-300"
		[]
	);

	// shared handlers
	const handleCopy = async (textVal: string) => {
		try {
			await navigator.clipboard.writeText(textVal);
		} catch (e) {
			console.error("Copy failed", e);
		}
	};

	function askDelete(mode: DeleteMode, ids: number[]) {
		return new Promise<boolean>((resolve) => {
			setDeleteConfirm({ open: true, ids, mode, resolve });
		});
	}

	const confirmDelete = () => {
		if (deleteConfirm.mode === "text") {
			if (deleteConfirm.ids.length === 1) {
				if (deleteConfirm.ids[0] !== undefined) {
					text.remove(deleteConfirm.ids[0]);
				}
			} else {
				text.bulkRemove(deleteConfirm.ids);
			}
		} else {
			if (deleteConfirm.ids.length === 1) {
				if (deleteConfirm.ids[0] !== undefined) {
					files.remove(deleteConfirm.ids[0]);
				}
			} else {
				files.bulkRemove(deleteConfirm.ids);
			}
		}

		deleteConfirm.resolve?.(true);
		setDeleteConfirm({ open: false, ids: [], mode: deleteConfirm.mode });
	};

	const confirmClearAll = () => {
		if (clearAllConfirm.mode === "text") text.clearAll();
		else files.clearAll();
		setClearAllConfirm({ open: false, mode: clearAllConfirm.mode });
	};

	return (
		<div className="h-full">
			<Tabs className="h-full" value={tab} onValueChange={(v) => setTab(v as any)}>
				<div className="flex items-center justify-between">
					<TabsList>
						<TabsTrigger value="text">ข้อความ</TabsTrigger>
						<TabsTrigger value="file">ไฟล์</TabsTrigger>
					</TabsList>
					{/* <StorageUsageInline /> */}
				</div>

				<TabsContent className={tabContentAnimate} value="text">
					<TextClipboardTab
						items={text.items}
						loading={text.loading}
						onReload={text.reload}
						onDelete={(id) => askDelete("text", [id])}
						onBulkDelete={(ids) => askDelete("text", ids)}
						onClearAll={() => setClearAllConfirm({ open: true, mode: "text" })}
						onTogglePin={text.togglePin}
						onCopy={handleCopy}
						onOpenView={(item) => setViewText({ open: true, item })}
					/>
				</TabsContent>

				<TabsContent className={tabContentAnimate} value="file">
					<FileClipboardTab
						files={files.files}
						loading={files.loading}
						onReload={files.reload}
						onDelete={(id) => askDelete("file", [id])}
						onBulkDelete={(ids) => askDelete("file", ids)}
						onClearAll={() => setClearAllConfirm({ open: true, mode: "file" })}
						onTogglePin={files.togglePin}
						onOpenView={(item) => setViewFile({ open: true, item })}
					/>
				</TabsContent>
			</Tabs>

			{/* dialogs */}
			<ViewTextDialog
				open={viewText.open}
				item={viewText.item}
				onOpenChange={(o) => setViewText({ open: o, item: o ? viewText.item : null })}
				onCopy={handleCopy}
			/>
			<ViewFileDialog
				open={viewFile.open}
				item={viewFile.item}
				onOpenChange={(o) => setViewFile({ open: o, item: o ? viewFile.item : null })}
			/>

			{/* delete confirm */}
			<AlertDialog
				open={deleteConfirm.open}
				onOpenChange={(o) => {
					if (!o && deleteConfirm.open) {
						deleteConfirm.resolve?.(false);
						setDeleteConfirm({ open: false, ids: [], mode: deleteConfirm.mode });
					} else {
						setDeleteConfirm((p) => ({ ...p, open: o }));
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{deleteConfirm.ids.length > 1
								? `Delete ${deleteConfirm.ids.length} selected ${deleteConfirm.mode === "text" ? "item(s)" : "file(s)"}?`
								: `Delete this ${deleteConfirm.mode === "text" ? "item" : "file"}?`}
						</AlertDialogTitle>
						<AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel
							onClick={() => {
								deleteConfirm.resolve?.(false);
								setDeleteConfirm((p) => ({ ...p, open: false }));
							}}
						>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* clear all confirm */}
			<AlertDialog
				open={clearAllConfirm.open}
				onOpenChange={(o) => setClearAllConfirm((p) => ({ ...p, open: o }))}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Clear all {clearAllConfirm.mode === "text" ? "items" : "files"}?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove everything in the current tab. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmClearAll}
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

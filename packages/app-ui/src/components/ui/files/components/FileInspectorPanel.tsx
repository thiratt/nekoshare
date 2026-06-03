import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { FileInspector } from "./FileInspector";
import type { FilesPageAction, FilesPageItem } from "../types";

type FileInspectorPanelProps = {
	file: FilesPageItem | null;
	onClose: () => void;
	onMissingFile: FilesPageAction;
	onOpenFile: FilesPageAction;
	onRemoveFromList: FilesPageAction;
	onRevealFile: FilesPageAction;
};

export function FileInspectorPanel({
	file,
	onClose,
	onMissingFile,
	onOpenFile,
	onRemoveFromList,
	onRevealFile,
}: FileInspectorPanelProps) {
	return (
		<AnimatePresence initial={false}>
			{file ? (
				<motion.div
					key="file-inspector-shell"
					initial={{ width: 0, marginLeft: 0, opacity: 0 }}
					animate={{ width: 320, marginLeft: 16, opacity: 1 }}
					exit={{ width: 0, marginLeft: 0, opacity: 0 }}
					transition={{
						duration: 0.22,
						ease: [0.16, 1, 0.3, 1],
						opacity: { duration: 0.12 },
					}}
					className="min-h-0 shrink-0 overflow-hidden"
					style={{ willChange: "width, margin-left, opacity" }}
				>
					<div className="h-full w-80 overflow-hidden">
						<FileInspector
							file={file}
							onClose={onClose}
							onMissingFile={onMissingFile}
							onOpenFile={onOpenFile}
							onRemoveFromList={onRemoveFromList}
							onRevealFile={onRevealFile}
						/>
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

import { AnimatePresence, motion } from "@workspace/app-ui/components/provide-animate";

import { FileInspector } from "./FileInspector";
import type { ReceivedFile } from "../types";

type FileInspectorPanelProps = {
	file: ReceivedFile | null;
	onClose: () => void;
};

export function FileInspectorPanel({ file, onClose }: FileInspectorPanelProps) {
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
						<FileInspector file={file} onClose={onClose} />
					</div>
				</motion.div>
			) : null}
		</AnimatePresence>
	);
}

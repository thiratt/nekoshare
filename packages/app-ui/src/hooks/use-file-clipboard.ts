import * as React from "react";

export type FileKind = "image" | "pdf" | "text" | "archive" | "audio" | "video" | "other";

export interface FileItem {
	id: number;
	name: string;
	size: number; // bytes
	kind: FileKind;
	url?: string; // for preview/download (mock)
	pinned: boolean;
	createdAt: string; // ISO
}

export function useFileClipboard() {
	const [files, setFiles] = React.useState<FileItem[]>([]);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setLoading(true);
		const t = setTimeout(() => {
			const now = new Date();
			setFiles([
				{
					id: 11,
					name: "design-spec.pdf",
					size: 1_240_120,
					kind: "pdf",
					pinned: false,
					createdAt: now.toISOString(),
					url: "#",
				},
				{
					id: 12,
					name: "screenshot.png",
					size: 420_330,
					kind: "image",
					pinned: false,
					createdAt: new Date(now.getTime() - 90_000).toISOString(),
					url: "/123.jpg",
				},
				{
					id: 13,
					name: "notes.txt",
					size: 6_520,
					kind: "text",
					pinned: false,
					createdAt: new Date(now.getTime() - 360_000).toISOString(),
					url: "#",
				},
			]);
			setLoading(false);
		}, 350);
		return () => clearTimeout(t);
	}, []);

	const reload = React.useCallback(async () => {
		setLoading(true);
		const t = setTimeout(() => {
			const now = new Date();
			setFiles([
				{
					id: Math.floor(Math.random() * 10_000),
					name: "export.zip",
					size: 2_410_000,
					kind: "archive",
					pinned: false,
					createdAt: now.toISOString(),
					url: "#",
				},
			]);
			setLoading(false);
		}, 300);
		return () => clearTimeout(t);
	}, []);

	const remove = React.useCallback((id: number) => setFiles((xs) => xs.filter((x) => x.id !== id)), []);
	const bulkRemove = React.useCallback(
		(ids: number[]) => setFiles((xs) => xs.filter((x) => !ids.includes(x.id))),
		[]
	);
	const clearAll = React.useCallback(() => setFiles([]), []);
	const togglePin = React.useCallback(
		(id: number) => setFiles((xs) => xs.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x))),
		[]
	);

	return { files, loading, reload, remove, bulkRemove, clearAll, togglePin };
}

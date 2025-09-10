import * as React from "react";

export interface ClipboardItem {
	id: number;
	content: string;
	pinned: boolean;
	createdAt: string; // ISO
}

export function useTextClipboard() {
	const [items, setItems] = React.useState<ClipboardItem[]>([]);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setLoading(true);
		const t = setTimeout(() => {
			const now = new Date();
			setItems([
				{ id: 1, content: "Welcome to your clipboard.", pinned: false, createdAt: now.toISOString() },
				{
					id: 2,
					content: "https://example.com/docs",
					pinned: false,
					createdAt: new Date(now.getTime() - 60_000).toISOString(),
				},
				{
					id: 3,
					content: `import * as React from "react";

export interface ClipboardItem {
	id: number;
	content: string;
	pinned: boolean;
	createdAt: string; // ISO
}

export function useTextClipboard() {
	const [items, setItems] = React.useState<ClipboardItem[]>([]);
	const [loading, setLoading] = React.useState(false);

	React.useEffect(() => {
		setLoading(true);
		const t = setTimeout(() => {
			const now = new Date();
			setItems([
				{ id: 1, content: "Welcome to your clipboard.", pinned: false, createdAt: now.toISOString() },
				{
					id: 2,
					content: "https://example.com/docs",
					pinned: true,
					createdAt: new Date(now.getTime() - 60_000).toISOString(),
				},
				{
					id: 3,
					content: "import x from 'y';\nexport const z = 1;",
					pinned: false,
					createdAt: new Date(now.getTime() - 120_000).toISOString(),
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
			setItems([
				{
					id: Math.floor(Math.random() * 10_000),
					content: "New item from refresh",
					pinned: false,
					createdAt: now.toISOString(),
				},
			]);
			setLoading(false);
		}, 300);
		return () => clearTimeout(t);
	}, []);

	const remove = React.useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
	const bulkRemove = React.useCallback(
		(ids: number[]) => setItems((xs) => xs.filter((x) => !ids.includes(x.id))),
		[]
	);
	const clearAll = React.useCallback(() => setItems([]), []);
	const togglePin = React.useCallback(
		(id: number) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x))),
		[]
	);

	return { items, loading, reload, remove, bulkRemove, clearAll, togglePin };
}
`,
					pinned: false,
					createdAt: new Date(now.getTime() - 120_000).toISOString(),
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
			setItems([
				{
					id: Math.floor(Math.random() * 10_000),
					content: "New item from refresh",
					pinned: false,
					createdAt: now.toISOString(),
				},
			]);
			setLoading(false);
		}, 300);
		return () => clearTimeout(t);
	}, []);

	const remove = React.useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
	const bulkRemove = React.useCallback(
		(ids: number[]) => setItems((xs) => xs.filter((x) => !ids.includes(x.id))),
		[]
	);
	const clearAll = React.useCallback(() => setItems([]), []);
	const togglePin = React.useCallback(
		(id: number) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x))),
		[]
	);

	return { items, loading, reload, remove, bulkRemove, clearAll, togglePin };
}

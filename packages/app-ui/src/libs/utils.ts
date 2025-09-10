export const CONTENT_PREVIEW_LENGTH = 150;

export function truncate(text: string, max = CONTENT_PREVIEW_LENGTH) {
	return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return "-";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	while (bytes >= 1024 && i < units.length - 1) {
		bytes /= 1024;
		i++;
	}
	return `${bytes.toFixed(bytes < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function getTextContentType(content: string): "URL" | "Code" | "Text" {
	if (content.startsWith("http")) return "URL";
	if (content.includes("import ") && content.includes("export")) return "Code";
	return "Text";
}

// export function formatDate(d: string | number | Date) {
// 	try {
// 		return new Date(d).toLocaleString();
// 	} catch {
// 		return String(d);
// 	}
// }

export function formatDate(d: string | number | Date) {
	try {
		return new Date(d).toLocaleString("th-TH", {
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "numeric",
			minute: "numeric",
			second: "numeric",
		});
	} catch {
		return String(d);
	}
}

export function bytes(n: number) {
	if (!Number.isFinite(n)) return "-";
	const u = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	while (n >= 1024 && i < u.length - 1) {
		n /= 1024;
		i++;
	}
	return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
}
export function when(s?: string) {
	if (!s) return "-";
	try {
		return new Date(s).toLocaleString();
	} catch {
		return s;
	}
}
export function mmss(ms: number) {
	const sec = Math.max(0, Math.ceil(ms / 1000));
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

import type { HomeDraftFile } from "../types";

const TEXT_LANGUAGE_BY_EXTENSION: Record<string, string> = {
	conf: "Config",
	css: "CSS",
	csv: "CSV",
	env: "Environment",
	html: "HTML",
	js: "JavaScript",
	json: "JSON",
	jsx: "JavaScript React",
	log: "Log",
	md: "Markdown",
	rs: "Rust",
	sql: "SQL",
	svg: "SVG",
	toml: "TOML",
	ts: "TypeScript",
	tsx: "TypeScript React",
	txt: "Text",
	xml: "XML",
	yaml: "YAML",
	yml: "YAML",
};

export function formatHomeFileSize(size: number) {
	if (!Number.isFinite(size) || size <= 0) return undefined;

	const units = ["B", "KB", "MB", "GB"] as const;
	let value = size;
	let unitIndex = 0;

	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}

	const digits = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
	return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function getHomeMediaCodecLabel(file: HomeDraftFile, fallback: string) {
	if (file.mimeType?.includes("/")) {
		return file.mimeType.split("/").pop()?.toUpperCase() ?? fallback;
	}

	const extension = getHomeFileExtension(file.name)?.toUpperCase();
	return extension ?? fallback;
}

export function getHomeTextLanguageLabel(file: HomeDraftFile) {
	const extension = getHomeFileExtension(file.name);

	if (extension && TEXT_LANGUAGE_BY_EXTENSION[extension]) {
		return TEXT_LANGUAGE_BY_EXTENSION[extension];
	}

	return file.mimeType?.startsWith("text/") ? file.mimeType.replace("text/", "Text / ") : "Text";
}

function getHomeFileExtension(name: string) {
	return name.includes(".") ? name.split(".").pop()?.toLowerCase() : undefined;
}

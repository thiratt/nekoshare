import type { IconType } from "react-icons";

import {
	LuArchive,
	LuFileImage,
	LuFileText,
	LuFilm,
} from "react-icons/lu";

import { fileTypeLabel } from "../constants";
import type { FileKind, ReceivedFile } from "../types";

export function getReceivedFileIcon(type: FileKind): IconType {
	switch (type) {
		case "image":
			return LuFileImage;
		case "document":
			return LuFileText;
		case "video":
			return LuFilm;
		case "archive":
			return LuArchive;
	}
}

export function matchReceivedFileSearch(file: ReceivedFile, query: string) {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) return true;

	return [file.name, file.source, file.receivedAt, fileTypeLabel(file.type)]
		.join(" ")
		.toLowerCase()
		.includes(normalizedQuery);
}


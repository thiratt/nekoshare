export function isFileDrag(dataTransfer: DataTransfer) {
	return Array.from(dataTransfer.types).includes("Files");
}

export function getFilesFromTransfer(dataTransfer: DataTransfer) {
	if (!isFileDrag(dataTransfer)) return [];
	return Array.from(dataTransfer.files);
}

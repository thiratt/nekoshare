import * as path from "path";
import { FORBIDDEN_EXTENSIONS, MAX_FILE_SIZE, MAX_JSON_SIZE, LogLevel } from "./constants";
import type { ClientRequest, FileInfo } from "./types";

export function sanitizeFileName(fileName: string): string {
	let sanitized = path.basename(fileName);

	sanitized = sanitized.replace(/\0/g, "");
	sanitized = sanitized.replace(/^\.+/, "");
	sanitized = sanitized.replace(/[<>:"|?*]/g, "_");

	if (sanitized.length > 255) {
		const ext = path.extname(sanitized);
		const nameWithoutExt = sanitized.slice(0, 255 - ext.length);
		sanitized = nameWithoutExt + ext;
	}

	if (!sanitized || sanitized === ".") {
		sanitized = `file_${Date.now()}`;
	}

	return sanitized;
}

export function generateUniqueFileName(originalName: string): string {
	const sanitized = sanitizeFileName(originalName);
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	const ext = path.extname(sanitized);
	const nameWithoutExt = path.basename(sanitized, ext);

	return `${timestamp}_${random}_${nameWithoutExt}${ext}`;
}

export function isValidFileExtension(fileName: string, allowedExtensions: string[]): boolean {
	const ext = path.extname(fileName).toLowerCase();

	if (FORBIDDEN_EXTENSIONS.includes(ext)) {
		return false;
	}

	if (allowedExtensions.length === 0) {
		return true;
	}

	return allowedExtensions.includes(ext);
}

export function isValidFileSize(size: number, maxSize: number = MAX_FILE_SIZE): boolean {
	return size > 0 && size <= maxSize;
}

export function isValidJsonSize(buffer: Buffer, maxSize: number = MAX_JSON_SIZE): boolean {
	return buffer.length <= maxSize;
}

export function validateClientRequest(request: unknown): request is ClientRequest {
	if (!request || typeof request !== "object") {
		return false;
	}

	const req = request as Partial<ClientRequest>;

	if (!req.message && !req.file) {
		return false;
	}

	if (req.file) {
		if (!validateFileInfo(req.file)) {
			return false;
		}
	}

	if (req.message !== undefined && typeof req.message !== "string") {
		return false;
	}

	return true;
}

export function validateFileInfo(fileInfo: unknown): fileInfo is FileInfo {
	if (!fileInfo || typeof fileInfo !== "object") {
		return false;
	}

	const file = fileInfo as Partial<FileInfo>;

	if (!file.name || typeof file.name !== "string") {
		return false;
	}

	if (typeof file.size !== "number" || file.size <= 0) {
		return false;
	}

	if (file.mimeType !== undefined && typeof file.mimeType !== "string") {
		return false;
	}

	if (file.checksum !== undefined && typeof file.checksum !== "string") {
		return false;
	}

	return true;
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	}
	return `${seconds}s`;
}

export class Logger {
	private static level: LogLevel = LogLevel.INFO;
	private static verbose: boolean = false;

	static setLevel(level: LogLevel): void {
		this.level = level;
	}

	static setVerbose(verbose: boolean): void {
		this.verbose = verbose;
	}

	private static shouldLog(level: LogLevel): boolean {
		const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
		return levels.indexOf(level) <= levels.indexOf(this.level);
	}

	private static formatMessage(level: LogLevel, component: string, message: string, data?: unknown): string {
		const timestamp = new Date().toISOString();
		const prefix = `[${timestamp}] [${level}] [${component}]`;

		if (data !== undefined) {
			return `${prefix} ${message} ${JSON.stringify(data)}`;
		}

		return `${prefix} ${message}`;
	}

	static error(component: string, message: string, error?: unknown): void {
		if (this.shouldLog(LogLevel.ERROR)) {
			console.error(this.formatMessage(LogLevel.ERROR, component, message, error));
		}
	}

	static warn(component: string, message: string, data?: unknown): void {
		if (this.shouldLog(LogLevel.WARN)) {
			console.warn(this.formatMessage(LogLevel.WARN, component, message, data));
		}
	}

	static info(component: string, message: string, data?: unknown): void {
		if (this.shouldLog(LogLevel.INFO)) {
			console.log(this.formatMessage(LogLevel.INFO, component, message, data));
		}
	}

	static debug(component: string, message: string, data?: unknown): void {
		if (this.verbose && this.shouldLog(LogLevel.DEBUG)) {
			console.log(this.formatMessage(LogLevel.DEBUG, component, message, data));
		}
	}
}

export function createErrorResponse(message: string): string {
	return (
		JSON.stringify({
			status: "error",
			message,
		}) + "\n"
	);
}

export function createSuccessResponse(message: string, data?: unknown): string {
	return (
		JSON.stringify({
			status: "success",
			message,
			data,
		}) + "\n"
	);
}

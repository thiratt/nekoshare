import * as path from "path";
import type { ServerConfig } from "./types";
import { env } from "@/config/env";

export const TCP_PORT = env.SOCKET_PORT;
export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_FILE_SIZE = 100 * 1024 * 1024;
export const MAX_CONNECTIONS = 100;
export const CONNECTION_TIMEOUT = 5 * 60 * 1000;
export const MAX_JSON_SIZE = 1 * 1024 * 1024;
export const CHUNK_SIZE = 64 * 1024;
export const MAX_BUFFER_SIZE = 10 * 1024 * 1024;
export const ALLOWED_EXTENSIONS: string[] = [
	// Images
	".jpg",
	".jpeg",
	".png",
	".gif",
	".webp",
	".bmp",
	".svg",
	// Documents
	".pdf",
	".doc",
	".docx",
	".xls",
	".xlsx",
	".ppt",
	".pptx",
	".txt",
	".csv",
	// Archives
	".zip",
	".rar",
	".7z",
	".tar",
	".gz",
	// Code
	".js",
	".ts",
	".jsx",
	".tsx",
	".json",
	".xml",
	".html",
	".css",
	".py",
	".java",
	".cpp",
	".c",
	".go",
	".rs",
	// Media
	".mp4",
	".avi",
	".mov",
	".wmv",
	".flv",
	".mp3",
	".wav",
	".ogg",
	".flac",
];

export const FORBIDDEN_EXTENSIONS: string[] = [
	".exe",
	".bat",
	".cmd",
	".sh",
	".ps1",
	".scr",
	".msi",
	".dll",
	".so",
	".dylib",
];

export const PROTOCOL_VERSION = "1.0";

export const MESSAGE_TYPES = {
	COMMAND: "CMD:",
	RESPONSE: "RES:",
	DATA: "DAT:",
	JSON: "JSON:",
} as const;

export const DELIMITERS = {
	MESSAGE: "\n",
	FIELD: "|",
} as const;

export const RELAY_COMMANDS = {
	LIST: "LS",
	CONNECT: "CONNECT",
	DISCONNECT: "DISCONNECT",
	MESSAGE: "MSG",
	FILE_START: "FILE_START",
	FILE_END: "FILE_END",
	PING: "PING",
	PONG: "PONG",
} as const;

export const RESPONSE_CODES = {
	OK: "OK",
	ERROR: "ERROR",
	BUSY: "BUSY",
	INVALID: "INVALID",
} as const;

export const RESPONSES = {
	UPLOAD_OK: `${MESSAGE_TYPES.RESPONSE}UPLOAD|${RESPONSE_CODES.OK}\n`,
	UPLOAD_ERROR: `${MESSAGE_TYPES.RESPONSE}UPLOAD|${RESPONSE_CODES.ERROR}\n`,
	GOODBYE: `${MESSAGE_TYPES.RESPONSE}BYE|${RESPONSE_CODES.OK}\n`,
	INVALID_REQUEST: `${MESSAGE_TYPES.RESPONSE}REQUEST|${RESPONSE_CODES.INVALID}\n`,
	FILE_TOO_LARGE: `${MESSAGE_TYPES.RESPONSE}FILE|${RESPONSE_CODES.ERROR}|TOO_LARGE\n`,
	FORBIDDEN_FILE_TYPE: `${MESSAGE_TYPES.RESPONSE}FILE|${RESPONSE_CODES.ERROR}|FORBIDDEN_TYPE\n`,
	SERVER_BUSY: `${MESSAGE_TYPES.RESPONSE}CONNECT|${RESPONSE_CODES.BUSY}\n`,
	WELCOME: (clientId: number) => `${MESSAGE_TYPES.RESPONSE}WELCOME|${clientId}|${PROTOCOL_VERSION}\n`,
	CONNECTED: (targetId: number) => `${MESSAGE_TYPES.RESPONSE}CONNECTED|${RESPONSE_CODES.OK}|${targetId}\n`,
	PEER_CONNECTED: (clientId: number) => `${MESSAGE_TYPES.RESPONSE}PEER_CONNECTED|${clientId}\n`,
	PEER_DISCONNECTED: `${MESSAGE_TYPES.RESPONSE}PEER_DISCONNECTED\n`,
	DISCONNECTED: `${MESSAGE_TYPES.RESPONSE}DISCONNECTED|${RESPONSE_CODES.OK}\n`,
	CLIENTS: (clients: number[]) => `${MESSAGE_TYPES.RESPONSE}CLIENTS|${clients.length}|${clients.join(",")}\n`,
	ERROR: (message: string) => `${MESSAGE_TYPES.RESPONSE}ERROR|${message}\n`,
	MESSAGE: (message: string) => `${MESSAGE_TYPES.DATA}${RELAY_COMMANDS.MESSAGE}|${message}\n`,
	FILE_START: (filename: string, size: string, compress: string) =>
		`${MESSAGE_TYPES.DATA}${RELAY_COMMANDS.FILE_START}|${filename}|${size}|${compress}\n`,
	FILE_END: `${MESSAGE_TYPES.DATA}${RELAY_COMMANDS.FILE_END}\n`,
	PONG: `${MESSAGE_TYPES.RESPONSE}PONG\n`,
} as const;

export const DEFAULT_CONFIG: ServerConfig = {
	port: TCP_PORT,
	uploadDir: UPLOAD_DIR,
	maxFileSize: MAX_FILE_SIZE,
	maxConnections: MAX_CONNECTIONS,
	connectionTimeout: CONNECTION_TIMEOUT,
	maxJsonSize: MAX_JSON_SIZE,
	verboseLogging: process.env.NODE_ENV === "development",
	allowedExtensions: ALLOWED_EXTENSIONS,
};

export enum LogLevel {
	ERROR = "ERROR",
	WARN = "WARN",
	INFO = "INFO",
	DEBUG = "DEBUG",
}

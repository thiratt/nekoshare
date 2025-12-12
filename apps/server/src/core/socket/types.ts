import type { Socket } from "net";
import type * as fs from "fs";

export type ConnectionMode = "WAIT_JSON" | "READING_FILE" | "RELAY_FILE";

export interface FileInfo {
	name: string;
	size: number;
	mimeType?: string;
	checksum?: string;
}

export interface ClientRequest {
	message?: string;
	file?: FileInfo;
	metadata?: {
		version?: string;
		platform?: string;
		userId?: string;
	};
}

export interface ServerResponse {
	status: "success" | "error";
	message: string;
	data?: unknown;
}

export interface ConnectionState {
	socket: Socket;
	buffer: Buffer;
	mode: ConnectionMode;
	fileBytesLeft: number;
	fileStream: fs.WriteStream | null;
	currentFileName: string | null;
	connectedAt: Date;
	totalBytesReceived: number;
	filesUploaded: number;
	clientId: number;
	peerId: number | null;
	inRelayMode: boolean;
}

export interface RelayClient {
	clientId: number;
	socket: Socket;
	peerId: number | null;
	connectedAt: Date;
}

export interface ServerConfig {
	port: number;
	uploadDir: string;
	maxFileSize: number;
	maxConnections: number;
	connectionTimeout: number;
	maxJsonSize: number;
	verboseLogging: boolean;
	allowedExtensions: string[];
}

export interface UploadStats {
	totalFiles: number;
	totalBytes: number;
	activeConnections: number;
	failedUploads: number;
	startTime: Date;
}

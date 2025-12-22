import * as fs from "fs";
import * as path from "path";
import type { ClientRequest, ConnectionState, ServerConfig } from "./types";
import { RELAY_COMMANDS, RESPONSES, MESSAGE_TYPES, DELIMITERS } from "./constants";
import {
	validateClientRequest,
	isValidFileExtension,
	isValidFileSize,
	generateUniqueFileName,
	createErrorResponse,
	formatBytes,
} from "./utils";
import { Logger } from "@/core/logger";
import type { RelayManager } from "./relay";

export async function handleJsonRequest(
	request: ClientRequest,
	state: ConnectionState,
	config: ServerConfig
): Promise<void> {
	Logger.debug("Handler", "Processing JSON request", { message: request.message, hasFile: !!request.file });

	if (request.message === "quit") {
		Logger.info("Handler", `Client ${state.clientId} requested disconnect`);
		state.socket.end(RESPONSES.GOODBYE);
		return;
	}

	if (request.file) {
		await initializeFileUpload(request.file, state, config);
		return;
	}

	if (request.message) {
		Logger.info("Handler", `Chat message from ${state.clientId}: ${request.message}`);
		state.socket.write(`Echo: ${request.message}\n`);
		return;
	}

	Logger.warn("Handler", `Invalid request from ${state.clientId}`);
	state.socket.write(RESPONSES.INVALID_REQUEST);
}

async function initializeFileUpload(
	fileInfo: ClientRequest["file"],
	state: ConnectionState,
	config: ServerConfig
): Promise<void> {
	if (!fileInfo) return;

	const { name, size } = fileInfo;

	if (!isValidFileSize(size, config.maxFileSize)) {
		Logger.warn("Handler", `File too large from ${state.clientId}`, {
			fileName: name,
			size: formatBytes(size),
			maxSize: formatBytes(config.maxFileSize),
		});
		state.socket.write(RESPONSES.FILE_TOO_LARGE);
		state.socket.destroy();
		return;
	}

	if (!isValidFileExtension(name, config.allowedExtensions)) {
		Logger.warn("Handler", `Forbidden file type from ${state.clientId}`, {
			fileName: name,
			extension: path.extname(name),
		});
		state.socket.write(RESPONSES.FORBIDDEN_FILE_TYPE);
		state.socket.destroy();
		return;
	}

	const uniqueFileName = generateUniqueFileName(name);
	const savePath = path.join(config.uploadDir, uniqueFileName);

	Logger.info("Handler", `Starting file upload from ${state.clientId}`, {
		originalName: name,
		savedAs: uniqueFileName,
		size: formatBytes(size),
	});

	try {
		state.fileStream = fs.createWriteStream(savePath);
		state.fileBytesLeft = size;
		state.currentFileName = uniqueFileName;
		state.mode = "READING_FILE";

		setupFileStreamHandlers(state, savePath);
	} catch (error) {
		Logger.error("Handler", `Failed to create file stream for ${state.clientId}`, error);
		state.socket.write(createErrorResponse("Failed to initialize file upload"));
		state.socket.destroy();
	}
}

function setupFileStreamHandlers(state: ConnectionState, savePath: string): void {
	if (!state.fileStream) return;

	state.fileStream.on("drain", () => {
		Logger.debug("Handler", `File stream drained, resuming socket for ${state.clientId}`);
		state.socket.resume();
	});

	state.fileStream.on("error", (error) => {
		Logger.error("Handler", `File write error for ${state.clientId}`, error);

		try {
			fs.unlinkSync(savePath);
		} catch (unlinkError) {
			Logger.error("Handler", `Failed to cleanup file ${savePath}`, unlinkError);
		}

		state.socket.write(RESPONSES.UPLOAD_ERROR);
		state.socket.destroy();
	});

	state.fileStream.on("finish", () => {
		Logger.info("Handler", `File upload completed for ${state.clientId}`, {
			fileName: state.currentFileName,
			totalBytes: formatBytes(state.totalBytesReceived),
		});
	});
}

export function handleFileData(state: ConnectionState): boolean {
	if (!state.fileStream || state.buffer.length === 0) {
		return false;
	}

	const bytesToProcess = Math.min(state.buffer.length, state.fileBytesLeft);
	const chunkToWrite = state.buffer.subarray(0, bytesToProcess);
	state.buffer = state.buffer.subarray(bytesToProcess);

	const canWrite = state.fileStream.write(chunkToWrite);
	state.fileBytesLeft -= bytesToProcess;
	state.totalBytesReceived += bytesToProcess;

	Logger.debug("Handler", `Processing file chunk for ${state.clientId}`, {
		chunkSize: formatBytes(bytesToProcess),
		remaining: formatBytes(state.fileBytesLeft),
	});

	if (!canWrite) {
		Logger.debug("Handler", `Backpressure detected, pausing socket for ${state.clientId}`);
		state.socket.pause();
	}

	if (state.fileBytesLeft === 0) {
		completeFileUpload(state);
		return true;
	}

	return false;
}

function completeFileUpload(state: ConnectionState): void {
	if (!state.fileStream) return;

	Logger.info("Handler", `Upload completed for ${state.clientId}`, {
		fileName: state.currentFileName,
	});

	state.fileStream.end();
	state.fileStream = null;
	state.currentFileName = null;
	state.mode = "WAIT_JSON";
	state.filesUploaded++;

	state.socket.write(RESPONSES.UPLOAD_OK);
	state.socket.resume();
}

export function processJsonFromBuffer(state: ConnectionState, config: ServerConfig): ClientRequest | null {
	const delimiterIndex = state.buffer.indexOf("\n");
	if (delimiterIndex === -1) return null;

	const jsonPart = state.buffer.subarray(0, delimiterIndex);
	state.buffer = state.buffer.subarray(delimiterIndex + 1);

	try {
		const request = JSON.parse(jsonPart.toString());

		if (!validateClientRequest(request)) {
			Logger.warn("Handler", `Invalid request format from ${state.clientId}`);
			state.socket.write(RESPONSES.INVALID_REQUEST);
			return null;
		}

		return request;
	} catch (error) {
		Logger.error("Handler", `JSON parse error from ${state.clientId}`, error);
		state.socket.write(createErrorResponse("Invalid JSON format"));
		state.socket.destroy();
		return null;
	}
}

function parseRelayCommand(message: string): { command: string; args: string[] } | null {
	const cleanMessage = message.startsWith(MESSAGE_TYPES.COMMAND)
		? message.substring(MESSAGE_TYPES.COMMAND.length)
		: message;

	const parts = cleanMessage.split(DELIMITERS.FIELD);
	if (parts.length === 0) return null;

	return {
		command: parts[0].trim().toUpperCase(),
		args: parts.slice(1).map((arg) => arg.trim()),
	};
}

export async function handleRelayCommand(
	command: string,
	state: ConnectionState,
	relayManager: RelayManager
): Promise<void> {
	const parsed = parseRelayCommand(command);

	if (!parsed) {
		Logger.warn("Handler", "Failed to parse relay command", {
			clientId: state.clientId,
			command: command.substring(0, 50),
		});
		state.socket.write(RESPONSES.ERROR("Invalid command format"));
		return;
	}

	Logger.debug("Handler", "Processing relay command", {
		clientId: state.clientId,
		command: parsed.command,
		argCount: parsed.args.length,
	});

	switch (parsed.command) {
		case RELAY_COMMANDS.LIST:
			relayManager.handleListCommand(state.clientId);
			break;

		case RELAY_COMMANDS.CONNECT: {
			if (parsed.args.length === 0) {
				state.socket.write(RESPONSES.ERROR("CONNECT requires target ID"));
				return;
			}

			const targetId = parseInt(parsed.args[0]);
			if (isNaN(targetId) || targetId <= 0) {
				state.socket.write(RESPONSES.ERROR("Invalid target ID"));
				return;
			}

			relayManager.handleConnectCommand(state.clientId, targetId);

			const client = relayManager.getClient(state.clientId);
			if (client) {
				state.peerId = client.peerId;
			}
			break;
		}

		case RELAY_COMMANDS.DISCONNECT:
			relayManager.handleDisconnectCommand(state.clientId);
			state.peerId = null;
			state.inRelayMode = false;
			break;

		case RELAY_COMMANDS.MESSAGE: {
			if (parsed.args.length === 0) {
				state.socket.write(RESPONSES.ERROR("MSG requires message content"));
				return;
			}

			const message = parsed.args.join(DELIMITERS.FIELD);
			relayManager.relayMessage(state.clientId, message);
			break;
		}

		case RELAY_COMMANDS.FILE_START: {
			if (parsed.args.length < 3) {
				state.socket.write(RESPONSES.ERROR("FILE_START requires filename, size, and compress flag"));
				return;
			}

			const [filename, filesize, compress] = parsed.args;

			const size = parseInt(filesize);
			if (isNaN(size) || size < 0) {
				state.socket.write(RESPONSES.ERROR("Invalid file size"));
				return;
			}

			relayManager.relayFileStart(state.clientId, filename, filesize, compress);

			state.inRelayMode = true;
			state.mode = "RELAY_FILE";

			Logger.info("Handler", "Relay file transfer started", {
				clientId: state.clientId,
				filename,
				filesize: size,
			});
			break;
		}

		case RELAY_COMMANDS.FILE_END:
			relayManager.relayFileEnd(state.clientId);

			state.inRelayMode = false;
			state.mode = "WAIT_JSON";

			Logger.info("Handler", "Relay file transfer completed", { clientId: state.clientId });
			break;

		case RELAY_COMMANDS.PING:
			state.socket.write(RESPONSES.PONG);
			Logger.debug("Handler", "PING received, sent PONG", { clientId: state.clientId });
			break;

		default:
			Logger.warn("Handler", "Unknown relay command", {
				clientId: state.clientId,
				command: parsed.command,
			});
			state.socket.write(RESPONSES.ERROR(`Unknown command: ${parsed.command}`));
	}
}

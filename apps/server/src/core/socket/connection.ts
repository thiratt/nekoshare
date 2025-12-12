import type { Socket } from "net";
import type { ConnectionState, ServerConfig, UploadStats } from "./types";
import { MAX_BUFFER_SIZE, RELAY_COMMANDS, RESPONSES, MESSAGE_TYPES } from "./constants";
import { Logger } from "../logger";
import { handleJsonRequest, handleFileData, processJsonFromBuffer, handleRelayCommand } from "./handlers";
import type { RelayManager } from "./relay";

export class ConnectionManager {
	private connections: Map<number, ConnectionState> = new Map();
	private stats: UploadStats;
	private relayManager: RelayManager | null = null;

	constructor(private config: ServerConfig) {
		this.stats = {
			totalFiles: 0,
			totalBytes: 0,
			activeConnections: 0,
			failedUploads: 0,
			startTime: new Date(),
		};
	}

	setRelayManager(relayManager: RelayManager): void {
		this.relayManager = relayManager;
	}

	getStats(): UploadStats {
		return { ...this.stats, activeConnections: this.connections.size };
	}

	canAcceptConnection(): boolean {
		return this.connections.size < this.config.maxConnections;
	}

	createConnection(socket: Socket, clientId: number): ConnectionState {
		const state: ConnectionState = {
			socket,
			buffer: Buffer.alloc(0),
			mode: "WAIT_JSON",
			fileBytesLeft: 0,
			fileStream: null,
			currentFileName: null,
			connectedAt: new Date(),
			totalBytesReceived: 0,
			filesUploaded: 0,
			clientId,
			peerId: null,
			inRelayMode: false,
		};

		this.connections.set(clientId, state);
		this.stats.activeConnections = this.connections.size;

		Logger.info("ConnectionManager", `New connection`, {
			clientId,
			totalConnections: this.connections.size,
		});

		return state;
	}

	removeConnection(clientId: number): void {
		const state = this.connections.get(clientId);
		if (!state) return;

		if (state.fileStream) {
			state.fileStream.destroy();
			this.stats.failedUploads++;
			Logger.warn("ConnectionManager", `Connection closed with incomplete upload: ${clientId}`);
		}

		this.stats.totalFiles += state.filesUploaded;
		this.stats.totalBytes += state.totalBytesReceived;

		this.connections.delete(clientId);
		this.stats.activeConnections = this.connections.size;

		Logger.info("ConnectionManager", `Connection closed: ${clientId}`, {
			filesUploaded: state.filesUploaded,
			totalConnections: this.connections.size,
		});
	}

	async handleData(clientId: number, chunk: Buffer): Promise<void> {
		const state = this.connections.get(clientId);
		if (!state) {
			Logger.warn("ConnectionManager", `Data received for unknown connection`, { clientId });
			return;
		}

		if (state.inRelayMode && this.relayManager) {
			const relayed = this.relayManager.relayData(clientId, chunk);
			if (!relayed) {
				Logger.warn("ConnectionManager", `Failed to relay data, exiting relay mode`, { clientId });
				state.inRelayMode = false;
			}
			return;
		}

		state.buffer = Buffer.concat([state.buffer, chunk]);

		if (state.buffer.length > MAX_BUFFER_SIZE) {
			Logger.error("ConnectionManager", `Buffer overflow`, {
				clientId,
				bufferSize: state.buffer.length,
				maxSize: MAX_BUFFER_SIZE,
			});
			state.socket.write("ERROR: Buffer overflow\n");
			state.socket.destroy();
			return;
		}

		await this.processBuffer(state);
	}

	private async processBuffer(state: ConnectionState): Promise<void> {
		let continueProcessing = true;

		while (continueProcessing) {
			if (state.mode === "WAIT_JSON" && this.relayManager) {
				const relayHandled = await this.tryHandleRelayCommand(state);
				if (relayHandled) {
					continue;
				}
			}

			if (state.mode === "WAIT_JSON") {
				const request = processJsonFromBuffer(state, this.config);
				if (!request) {
					continueProcessing = false;
					break;
				}

				await handleJsonRequest(request, state, this.config);
			} else if (state.mode === "READING_FILE") {
				const completed = handleFileData(state);
				if (!completed && state.buffer.length === 0) {
					continueProcessing = false;
					break;
				}
			} else if (state.mode === "RELAY_FILE") {
				continueProcessing = false;
			} else {
				Logger.error("ConnectionManager", `Unknown mode`, {
					clientId: state.clientId,
					mode: state.mode,
				});
				continueProcessing = false;
			}
		}
	}

	private async tryHandleRelayCommand(state: ConnectionState): Promise<boolean> {
		const newlineIndex = state.buffer.indexOf("\n");
		if (newlineIndex === -1) {
			return false;
		}

		const line = state.buffer.subarray(0, newlineIndex).toString().trim();

		const isRelayCommand =
			line.startsWith(MESSAGE_TYPES.COMMAND) ||
			line.startsWith(RELAY_COMMANDS.LIST) ||
			line.startsWith(RELAY_COMMANDS.CONNECT) ||
			line.startsWith(RELAY_COMMANDS.DISCONNECT) ||
			line.startsWith(RELAY_COMMANDS.MESSAGE) ||
			line.startsWith(RELAY_COMMANDS.FILE_START) ||
			line.startsWith(RELAY_COMMANDS.FILE_END) ||
			line.startsWith(RELAY_COMMANDS.PING);

		if (isRelayCommand) {
			state.buffer = state.buffer.subarray(newlineIndex + 1);

			if (this.relayManager) {
				try {
					await handleRelayCommand(line, state, this.relayManager);
				} catch (error) {
					Logger.error("ConnectionManager", "Error handling relay command", {
						clientId: state.clientId,
						error,
					});
					state.socket.write(RESPONSES.ERROR("Command processing failed"));
				}
			}

			return true;
		}

		return false;
	}

	setupSocketHandlers(socket: Socket, clientId: number): void {
		socket.setTimeout(this.config.connectionTimeout);

		socket.on("timeout", () => {
			Logger.warn("ConnectionManager", `Connection timeout`, { clientId });
			socket.write("ERROR: Connection timeout\n");
			socket.destroy();
		});

		socket.on("data", async (chunk) => {
			await this.handleData(clientId, chunk);
		});

		socket.on("error", (error) => {
			Logger.error("ConnectionManager", `Socket error`, { clientId, error });
		});

		socket.on("close", () => {
			if (this.relayManager) {
				this.relayManager.unregisterClient(clientId);
			}
			this.removeConnection(clientId);
		});

		socket.on("end", () => {
			Logger.debug("ConnectionManager", `Client initiated disconnect`, { clientId });
		});
	}

	cleanup(): void {
		Logger.info("ConnectionManager", "Cleaning up all connections", {
			count: this.connections.size,
		});

		for (const [clientId, state] of this.connections.entries()) {
			if (state.fileStream) {
				state.fileStream.destroy();
			}
			state.socket.destroy();
			this.connections.delete(clientId);
		}
	}

	getConnectionCount(): number {
		return this.connections.size;
	}
}

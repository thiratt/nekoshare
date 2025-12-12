import { createServer, Server as NetServer } from "net";
import * as fs from "fs";
import type { ServerConfig } from "./types";
import { DEFAULT_CONFIG, RESPONSES } from "./constants";
import { Logger, formatDuration, formatBytes } from "./utils";
import { ConnectionManager } from "./connection";
import { RelayManager } from "./relay";

export class TCPFileServer {
	private server: NetServer | null = null;
	private connectionManager: ConnectionManager;
	private relayManager: RelayManager;
	private config: ServerConfig;
	private startTime: Date | null = null;

	constructor(config: Partial<ServerConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.connectionManager = new ConnectionManager(this.config);
		this.relayManager = new RelayManager();
		this.connectionManager.setRelayManager(this.relayManager);

		Logger.setVerbose(this.config.verboseLogging);

		this.ensureUploadDirectory();
	}

	private ensureUploadDirectory(): void {
		if (!fs.existsSync(this.config.uploadDir)) {
			try {
				fs.mkdirSync(this.config.uploadDir, { recursive: true });
				Logger.info("Server", `Created upload directory: ${this.config.uploadDir}`);
			} catch (error) {
				Logger.error("Server", `Failed to create upload directory: ${this.config.uploadDir}`, error);
				throw error;
			}
		}
	}

	start(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.server = createServer((socket) => {
					if (!this.connectionManager.canAcceptConnection()) {
						Logger.warn("Server", `Connection rejected - max connections reached`, {
							maxConnections: this.config.maxConnections,
						});
						socket.write(RESPONSES.SERVER_BUSY);
						socket.destroy();
						return;
					}

					const clientId = this.relayManager.registerClient(socket);
					const state = this.connectionManager.createConnection(socket, clientId);
					this.connectionManager.setupSocketHandlers(socket, clientId);
				});

				this.server.on("error", (error) => {
					Logger.error("Server", "Server error", error);
					reject(error);
				});

				this.server.listen(this.config.port, () => {
					this.startTime = new Date();
					Logger.info("Server", `TCP Server started on port ${this.config.port}`);
					resolve();
				});
			} catch (error) {
				Logger.error("Server", "Failed to start server", error);
				reject(error);
			}
		});
	}

	async stop(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.server) {
				resolve();
				return;
			}

			Logger.info("Server", "Stopping server...");

			this.relayManager.cleanup();
			this.connectionManager.cleanup();
			this.server.close((error) => {
				if (error) {
					Logger.error("Server", "Error stopping server", error);
					reject(error);
				} else {
					const stats = this.getStats();
					Logger.info("Server", "Server stopped", stats);
					this.server = null;
					resolve();
				}
			});
		});
	}

	getStats() {
		const uploadStats = this.connectionManager.getStats();
		const relayStats = this.relayManager.getStats();
		const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;

		return {
			...uploadStats,
			...relayStats,
			uptime: formatDuration(uptime),
			uptimeMs: uptime,
			totalBytesFormatted: formatBytes(uploadStats.totalBytes),
		};
	}

	isRunning(): boolean {
		return this.server !== null && this.server.listening;
	}

	getConfig(): ServerConfig {
		return { ...this.config };
	}
}

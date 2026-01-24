import { config } from "../config";
import { AppError, createTimeoutError, createWebSocketError, ErrorCategory, ErrorSource } from "../errors";
import { BinaryReader, BinaryWriter } from "./binary-utils";
import { getPacketTypeName, PacketType } from "./protocol";

type PacketHandler = (reader: BinaryReader) => void;
type StatusChangeHandler = (status: SocketStatus) => void;

export type SocketStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

interface PendingRequest {
	readonly resolve: (data: BinaryReader) => void;
	readonly reject: (err: AppError) => void;
	readonly timer: number;
	readonly packetType: PacketType;
	readonly startTime: number;
}

export interface SocketRequestOptions {
	timeoutMs?: number;
}

export interface SocketStats {
	readonly status: SocketStatus;
	readonly lastMessageTime: number;
	readonly pendingRequestCount: number;
	readonly reconnectAttempts: number;
	readonly url: string;
}

const WATCHDOG_TIMEOUT_MS = 60000;
const WATCHDOG_INTERVAL_MS = 5000;
const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;
const MINIMUM_PACKET_SIZE = 5;
const DEFAULT_REQUEST_TIMEOUT_MS = 10000;

export class NekoSocket {
	private readonly url: string;
	private ws: WebSocket | null = null;
	private status: SocketStatus = "disconnected";
	private shouldReconnect = false;
	private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
	private reconnectAttempts = 0;
	private lastMessageTime = Date.now();
	private watchdogTimer: number | null = null;

	private readonly packetListeners = new Map<PacketType, Set<PacketHandler>>();
	private readonly statusListeners = new Set<StatusChangeHandler>();
	private readonly pendingRequests = new Map<number, PendingRequest>();

	constructor(url: string) {
		if (!url || url.trim().length === 0) {
			throw new AppError(
				"WebSocket URL is required",
				ErrorSource.INTERNAL,
				ErrorCategory.VALIDATION,
				{ operation: "NekoSocket initialization" },
				false,
			);
		}
		this.url = url;
	}

	public connect(): void {
		if (this.ws?.readyState === WebSocket.OPEN || this.status === "connecting") {
			return;
		}

		this.shouldReconnect = true;
		this.updateStatus("connecting");

		try {
			this.ws = new WebSocket(this.url);
			this.ws.binaryType = "arraybuffer";

			this.ws.onopen = this.handleOpen;
			this.ws.onclose = this.handleClose;
			this.ws.onerror = this.handleError;
			this.ws.onmessage = this.handleMessage;
		} catch (error) {
			console.error(
				"[NekoSocket] Connection failed synchronously:",
				error instanceof Error ? error.message : error,
			);
			this.handleClose(new CloseEvent("error"));
		}
	}

	public disconnect(): void {
		this.shouldReconnect = false;
		this.stopWatchdog();
		this.rejectAllPendingRequests("Socket disconnected by user");
		this.updateStatus("disconnected");

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	public getStatus(): SocketStatus {
		return this.status;
	}

	public getStats(): SocketStats {
		return {
			status: this.status,
			lastMessageTime: this.lastMessageTime,
			pendingRequestCount: this.pendingRequests.size,
			reconnectAttempts: this.reconnectAttempts,
			url: this.url,
		};
	}

	public on(type: PacketType, handler: PacketHandler): () => void {
		let handlers = this.packetListeners.get(type);
		if (!handlers) {
			handlers = new Set();
			this.packetListeners.set(type, handlers);
		}
		handlers.add(handler);

		return () => {
			this.packetListeners.get(type)?.delete(handler);
		};
	}

	public onStatusChange(handler: StatusChangeHandler): () => void {
		this.statusListeners.add(handler);
		return () => this.statusListeners.delete(handler);
	}

	public send(type: PacketType, payloadWriter?: (w: BinaryWriter) => void): void {
		this.sendInternal(type, payloadWriter, 0);
	}

	public request(
		type: PacketType,
		payloadWriter?: (w: BinaryWriter) => void,
		options: SocketRequestOptions = {},
	): Promise<BinaryReader> {
		const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = options;
		const packetTypeName = getPacketTypeName(type);

		return new Promise((resolve, reject) => {
			if (this.ws?.readyState !== WebSocket.OPEN) {
				reject(
					createWebSocketError(
						`Cannot send ${packetTypeName} request: WebSocket is not connected (current status: ${this.status})`,
					),
				);
				return;
			}

			const requestId = this.generateRequestId();
			const startTime = Date.now();

			const timer = window.setTimeout(() => {
				if (this.pendingRequests.has(requestId)) {
					this.pendingRequests.delete(requestId);
					reject(createTimeoutError(`WebSocket ${packetTypeName} request`, timeoutMs));
				}
			}, timeoutMs);

			const wrappedReject = (error: AppError) => {
				clearTimeout(timer);
				reject(error);
			};

			this.pendingRequests.set(requestId, {
				resolve,
				reject: wrappedReject,
				timer,
				packetType: type,
				startTime,
			});

			try {
				this.sendInternal(type, payloadWriter, requestId);
			} catch (error) {
				clearTimeout(timer);
				this.pendingRequests.delete(requestId);
				reject(
					error instanceof AppError
						? error
						: createWebSocketError(
								`Failed to send ${packetTypeName} request: ${error instanceof Error ? error.message : "Unknown error"}`,
							),
				);
			}
		});
	}

	private sendInternal(type: PacketType, payloadWriter?: (w: BinaryWriter) => void, requestId: number = 0): void {
		if (this.ws?.readyState !== WebSocket.OPEN) {
			const packetTypeName = getPacketTypeName(type);
			console.warn(`[NekoSocket] Cannot send packet ${packetTypeName}: Socket not open (status: ${this.status})`);
			return;
		}

		const writer = new BinaryWriter();
		writer.writeUInt8(type);
		writer.writeInt32(requestId);

		if (payloadWriter) {
			payloadWriter(writer);
		}

		this.ws.send(writer.getBuffer());
	}

	private generateRequestId(): number {
		return Math.floor(Math.random() * 0x7fffffff) || 1;
	}

	private updateStatus(newStatus: SocketStatus): void {
		if (this.status === newStatus) return;
		this.status = newStatus;
		this.statusListeners.forEach((callback) => callback(newStatus));
	}

	private rejectAllPendingRequests(reason: string): void {
		const error = createWebSocketError(reason);

		this.pendingRequests.forEach((request) => {
			clearTimeout(request.timer);
			request.reject(error);
		});

		this.pendingRequests.clear();
	}

	private handleOpen = (): void => {
		console.log("[NekoSocket] Connected to", this.url);
		this.updateStatus("connected");
		this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
		this.reconnectAttempts = 0;
		this.startWatchdog();
	};

	private handleClose = (event: CloseEvent): void => {
		event.preventDefault();
		this.stopWatchdog();

		if (!this.shouldReconnect) {
			return;
		}

		this.rejectAllPendingRequests("WebSocket connection closed unexpectedly");
		this.updateStatus("reconnecting");
		this.ws = null;
		this.reconnectAttempts++;

		console.log(
			`[NekoSocket] Connection closed. Reconnecting in ${this.reconnectDelay}ms... (attempt ${this.reconnectAttempts})`,
		);

		setTimeout(() => this.connect(), this.reconnectDelay);
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
	};

	private handleError = (event: Event): void => {
		console.error("[NekoSocket] WebSocket error:", event);
	};

	private handleMessage = (event: MessageEvent): void => {
		const buffer = event.data as ArrayBuffer;

		if (buffer.byteLength < MINIMUM_PACKET_SIZE) {
			console.warn(
				`[NekoSocket] Received packet too small (${buffer.byteLength} bytes, minimum ${MINIMUM_PACKET_SIZE})`,
			);
			return;
		}

		this.lastMessageTime = Date.now();

		const reader = new BinaryReader(buffer);
		const type = reader.readUInt8() as PacketType;
		const requestId = reader.readInt32();

		if (requestId !== 0 && this.pendingRequests.has(requestId)) {
			const request = this.pendingRequests.get(requestId)!;
			clearTimeout(request.timer);
			this.pendingRequests.delete(requestId);

			if (type >= 0xf0) {
				let errorMessage = "Unknown server error";
				try {
					errorMessage = reader.readString();
				} catch (parseError) {
					console.error("[NekoSocket] Failed to read error message from packet:", parseError);
				}

				request.reject(
					new AppError(
						`Server returned error for ${getPacketTypeName(request.packetType)}: ${errorMessage}`,
						ErrorSource.EXTERNAL_WEBSOCKET,
						ErrorCategory.SERVER,
						{
							operation: `WebSocket ${getPacketTypeName(request.packetType)} request`,
							metadata: {
								requestId,
								responseType: type,
								durationMs: Date.now() - request.startTime,
							},
						},
					),
				);
			} else {
				request.resolve(reader);
			}
			return;
		}

		const handlers = this.packetListeners.get(type);
		if (handlers && handlers.size > 0) {
			handlers.forEach((handler) => {
				try {
					const handlerReader = new BinaryReader(buffer);
					handlerReader.readUInt8();
					handlerReader.readInt32();
					handler(handlerReader);
				} catch (error) {
					console.error(
						`[NekoSocket] Error in handler for ${getPacketTypeName(type)}:`,
						error instanceof Error ? error.message : error,
					);
				}
			});
		}
	};

	private startWatchdog(): void {
		this.stopWatchdog();
		this.lastMessageTime = Date.now();

		this.watchdogTimer = window.setInterval(() => {
			const silentTime = Date.now() - this.lastMessageTime;

			if (silentTime > WATCHDOG_TIMEOUT_MS) {
				console.warn(
					`[NekoSocket] Connection appears dead (no messages for ${Math.round(silentTime / 1000)}s). Reconnecting...`,
				);
				this.ws?.close();
			}
		}, WATCHDOG_INTERVAL_MS);
	}

	private stopWatchdog(): void {
		if (this.watchdogTimer !== null) {
			clearInterval(this.watchdogTimer);
			this.watchdogTimer = null;
		}
	}
}

export const socketClient = new NekoSocket(config.webSocketBaseUrl);

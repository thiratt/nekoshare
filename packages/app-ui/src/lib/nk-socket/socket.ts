import { config } from "../config";
import { BinaryReader, BinaryWriter } from "./binary-utils";
import { PacketType } from "./protocol";

type PacketHandler = (reader: BinaryReader) => void;
type StatusChangeHandler = (status: SocketStatus) => void;

export type SocketStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

interface PendingRequest {
	resolve: (data: BinaryReader) => void;
	reject: (err: Error) => void;
	timer: number;
}

export class NekoSocket {
	private readonly WATCHDOG_TIMEOUT = 60000;

	private lastMessageTime = Date.now();
	private packetListeners = new Map<PacketType, Set<PacketHandler>>();
	private pendingRequests = new Map<number, PendingRequest>();
	private reconnectDelay = 1000;
	private shouldReconnect = false;
	private status: SocketStatus = "disconnected";
	private statusListeners = new Set<StatusChangeHandler>();
	private url: string;
	private watchdogTimer: number | null = null;
	private ws: WebSocket | null = null;

	constructor(url: string) {
		this.url = url;
	}

	public connect() {
		if (this.ws?.readyState === WebSocket.OPEN || this.status === "connecting") return;

		this.shouldReconnect = true;
		this.status = "connecting";
		this.notifyStatus();

		try {
			this.ws = new WebSocket(this.url);
			this.ws.binaryType = "arraybuffer";

			this.ws.onopen = this.handleOpen;
			this.ws.onclose = this.handleClose;
			this.ws.onerror = this.handleError;
			this.ws.onmessage = this.handleMessage;
		} catch (err) {
			console.error("Connection failed synchronously:", err);
			this.handleClose(new CloseEvent("error"));
		}
	}

	public disconnect() {
		this.shouldReconnect = false;
		this.status = "disconnected";
		this.notifyStatus();

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	public on(type: PacketType, handler: PacketHandler) {
		if (!this.packetListeners.has(type)) {
			this.packetListeners.set(type, new Set());
		}
		this.packetListeners.get(type)!.add(handler);

		return () => {
			this.packetListeners.get(type)?.delete(handler);
		};
	}

	public onStatusChange(handler: StatusChangeHandler) {
		this.statusListeners.add(handler);
		return () => this.statusListeners.delete(handler);
	}

	public request(
		type: PacketType,
		payloadWriter?: (w: BinaryWriter) => void,
		timeoutMs = 10000
	): Promise<BinaryReader> {
		return new Promise((resolve, reject) => {
			const requestId = this.generateRequestId();

			const timer = window.setTimeout(() => {
				if (this.pendingRequests.has(requestId)) {
					this.pendingRequests.delete(requestId);
					reject(new Error(`Request Timeout (${PacketType[type]})`));
				}
			}, timeoutMs);

			this.pendingRequests.set(requestId, { resolve, reject, timer });

			try {
				this.send(type, payloadWriter, requestId);
			} catch (e) {
				clearTimeout(timer);
				this.pendingRequests.delete(requestId);
				reject(e);
			}
		});
	}

	public send(type: PacketType, payloadWriter?: (w: BinaryWriter) => void, requestId: number = 0) {
		if (this.ws?.readyState !== WebSocket.OPEN) {
			console.warn("Socket not open. Cannot send packet:", PacketType[type]);
			return;
		}

		const writer = new BinaryWriter();
		writer.writeUInt8(type);
		writer.writeInt32(requestId);

		if (payloadWriter) payloadWriter(writer);

		this.ws.send(writer.getBuffer());
	}

	private generateRequestId(): number {
		return Math.floor(Math.random() * 0x7fffffff) || 1;
	}

	private handleClose = (evt: CloseEvent) => {
		evt.preventDefault();
		this.stopWatchdog();

		if (!this.shouldReconnect) return;

		this.status = "reconnecting";
		this.notifyStatus();
		this.ws = null;

		console.log(`WS Closed. Reconnecting in ${this.reconnectDelay}ms...`);
		setTimeout(() => this.connect(), this.reconnectDelay);
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
	};

	private handleError = (evt: Event) => {
		console.error("WS Error:", evt);
	};

	private handleMessage = (evt: MessageEvent) => {
		const buffer = evt.data as ArrayBuffer;
		if (buffer.byteLength < 5) return;

		this.lastMessageTime = Date.now();

		const reader = new BinaryReader(buffer);
		const type = reader.readUInt8();
		const requestId = reader.readInt32();

		if (requestId !== 0 && this.pendingRequests.has(requestId)) {
			const req = this.pendingRequests.get(requestId)!;
			clearTimeout(req.timer);
			this.pendingRequests.delete(requestId);

			if (type >= 0xf0) {
				let errorMsg = "Unknown Error";
				try {
					errorMsg = reader.readString();
				} catch (e) {
					console.error("Failed to read error message from packet:", e);
				}
				req.reject(new Error(errorMsg));
			} else {
				req.resolve(reader);
			}
			return;
		}

		const handlers = this.packetListeners.get(type);
		if (handlers) {
			handlers.forEach((handler) => {
				const clonedReader = new BinaryReader(buffer);
				clonedReader.readUInt8();
				clonedReader.readInt32();
				handler(clonedReader);
			});
		}
	};

	private handleOpen = () => {
		console.log("WS Connected");
		this.status = "connected";
		this.reconnectDelay = 1000;
		this.notifyStatus();
		this.startWatchdog();
	};

	private notifyStatus() {
		this.statusListeners.forEach((cb) => cb(this.status));
	}

	private startWatchdog() {
		this.stopWatchdog();
		this.lastMessageTime = Date.now();

		this.watchdogTimer = window.setInterval(() => {
			const silentTime = Date.now() - this.lastMessageTime;
			if (silentTime > this.WATCHDOG_TIMEOUT) {
				console.warn(`Connection dead (No pong for ${silentTime}ms). Reconnecting...`);
				this.ws?.close();
			}
		}, 5000);
	}

	private stopWatchdog() {
		if (this.watchdogTimer) {
			clearInterval(this.watchdogTimer);
			this.watchdogTimer = null;
		}
	}
}

export const socketClient = new NekoSocket(config.webSocketBaseUrl);

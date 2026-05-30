export const RelayTransportKind = {
	RELAY_WS: "RELAY_WS",
	RELAY_NATIVE: "RELAY_NATIVE",
} as const;

export type RelayTransportKind = (typeof RelayTransportKind)[keyof typeof RelayTransportKind];

export const TransportState = {
	PLANNED: "PLANNED",
	PREPARING: "PREPARING",
	READY: "READY",
	CONNECTING: "CONNECTING",
	CONNECTED: "CONNECTED",
	FAILED: "FAILED",
	CLOSED: "CLOSED",
} as const;

export type TransportState = (typeof TransportState)[keyof typeof TransportState];

export interface LanDirectTransport {
	mode: "LAN_DIRECT";
	state: TransportState;
	host?: string;
	port?: number;
	fingerprint?: string;
}

export interface RelayTransport {
	mode: "RELAY";
	state: TransportState;
	kind: RelayTransportKind;
	relayId?: string;
	ticketId?: string;
	byteLimit?: number;
	expiresAt?: string;
}

export type TransferTransport = LanDirectTransport | RelayTransport;

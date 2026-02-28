import type { BinaryReader } from "@/infrastructure/socket/protocol/binary-reader";
import type { IConnection } from "@/infrastructure/socket/runtime/types";

export type PeerTransport = "TCP" | "WebSocket";

export type PeerCommandHandler<T extends IConnection = IConnection> = (
	client: T,
	reader: BinaryReader,
	requestId: number,
) => Promise<void> | void;

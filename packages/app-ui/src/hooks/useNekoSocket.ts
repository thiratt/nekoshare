import { useCallback, useEffect, useState } from "react";

import {
	BinaryReader,
	BinaryWriter,
	NekoSocket,
	PacketParsers,
	type PacketPayloads,
	PacketType,
	socketClient,
	type SocketRequestOptions,
	type SocketStats,
	type SocketStatus,
} from "@workspace/app-ui/lib/nk-socket/index";

export interface UseNekoSocketReturn {
	readonly status: SocketStatus;
	readonly stats: SocketStats;
	readonly connect: () => void;
	readonly disconnect: () => void;
	readonly send: (type: PacketType, payloadWriter?: (w: BinaryWriter) => void) => void;
	readonly request: (
		type: PacketType,
		payloadWriter?: (w: BinaryWriter) => void,
		options?: SocketRequestOptions,
	) => Promise<BinaryReader>;
	readonly on: (type: PacketType, callback: (reader: BinaryReader) => void) => () => void;
	readonly client: NekoSocket;
}

function useNekoSocket(): UseNekoSocketReturn {
	const [status, setStatus] = useState<SocketStatus>(socketClient.getStatus());
	const [stats, setStats] = useState<SocketStats>(socketClient.getStats());

	useEffect(() => {
		const unsubStatus = socketClient.onStatusChange((newStatus) => {
			setStatus(newStatus);
			setStats(socketClient.getStats());
		});

		if (socketClient.getStatus() === "disconnected") {
			socketClient.connect();
		}

		setStatus(socketClient.getStatus());
		setStats(socketClient.getStats());

		return () => {
			unsubStatus();
		};
	}, []);

	const connect = useCallback(() => {
		socketClient.connect();
	}, []);

	const disconnect = useCallback(() => {
		socketClient.disconnect();
	}, []);

	const send = useCallback((type: PacketType, payloadWriter?: (w: BinaryWriter) => void) => {
		socketClient.send(type, payloadWriter);
	}, []);

	const request = useCallback(
		(
			type: PacketType,
			payloadWriter?: (w: BinaryWriter) => void,
			options?: SocketRequestOptions,
		): Promise<BinaryReader> => {
			return socketClient.request(type, payloadWriter, options);
		},
		[],
	);

	const on = useCallback((type: PacketType, callback: (reader: BinaryReader) => void): (() => void) => {
		return socketClient.on(type, callback);
	}, []);

	return {
		status,
		stats,
		connect,
		disconnect,
		send,
		request,
		on,
		client: socketClient,
	};
}

export {
	BinaryReader,
	BinaryWriter,
	NekoSocket,
	PacketParsers,
	type PacketPayloads,
	PacketType,
	socketClient,
	type SocketStatus,
	useNekoSocket,
};

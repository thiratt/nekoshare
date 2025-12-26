import { useCallback, useEffect, useState } from "react";

import {
	BinaryReader,
	BinaryWriter,
	NekoSocket,
	PacketParsers,
	PacketPayloads,
	PacketType,
	socketClient,
	SocketStatus,
} from "@workspace/app-ui/lib/nk-socket/index";

function useNekoSocket() {
	const [status, setStatus] = useState<SocketStatus>("disconnected");

	useEffect(() => {
		const unsubStatus = socketClient.onStatusChange((newStatus) => {
			setStatus(newStatus);
		});

		socketClient.connect();

		return () => {
			unsubStatus();
		};
	}, []);

	const send = useCallback((type: PacketType, payloadWriter?: (w: BinaryWriter) => void) => {
		socketClient.send(type, payloadWriter);
	}, []);

	const request = useCallback((type: PacketType, payloadWriter?: (w: BinaryWriter) => void) => {
		return socketClient.request(type, payloadWriter);
	}, []);

	const on = useCallback((type: PacketType, callback: (reader: BinaryReader) => void) => {
		return socketClient.on(type, callback);
	}, []);

	return {
		status,
		connect: useCallback(() => socketClient.connect(), []),
		disconnect: useCallback(() => socketClient.disconnect(), []),
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

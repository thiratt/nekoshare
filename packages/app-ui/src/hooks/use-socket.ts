import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@workspace/app-ui/lib/auth";

const SERVER_URL = "ws://localhost:7780/ws";

type WebSocketStatus = "disconnected" | "connecting" | "connected" | "error";

function useSocket() {
	const [status, setStatus] = useState<WebSocketStatus>("disconnected");
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const reconnectAttemptsRef = useRef(0);
	const maxReconnectAttempts = 5;

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
		}
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}
		setStatus("disconnected");
	}, []);

	const connect = useCallback(async (): Promise<WebSocket> => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			return wsRef.current;
		}

		setStatus("connecting");

		try {
			const { data, error } = await authClient.oneTimeToken.generate();
			if (error) throw error;

			return new Promise((resolve, reject) => {
				const ws = new WebSocket(SERVER_URL, [data.token]);
				wsRef.current = ws;

				ws.onopen = () => {
					setStatus("connected");
					reconnectAttemptsRef.current = 0;
					console.log("WebSocket connected");
					resolve(ws);
				};

				ws.onerror = (event) => {
					setStatus("error");
					console.error("WebSocket error:", event);
					reject(new Error("WebSocket connection error"));
				};

				ws.onclose = () => {
					setStatus("disconnected");
					console.log("WebSocket disconnected");

					if (reconnectAttemptsRef.current < maxReconnectAttempts) {
						const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 30000);
						reconnectAttemptsRef.current++;
						console.log(
							`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
						);

						reconnectTimeoutRef.current = setTimeout(() => {
							connect().catch(console.error);
						}, delay);
					}
				};
			});
		} catch (error) {
			setStatus("error");
			throw error;
		}
	}, []);

	const sendMessage = useCallback((message: string | object) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			const data = typeof message === "string" ? message : JSON.stringify(message);
			wsRef.current.send(data);
		} else {
			console.warn("WebSocket is not connected. Message not sent:", message);
		}
	}, []);

	useEffect(() => {
		return () => {
			disconnect();
		};
	}, [disconnect]);

	return { connect, disconnect, sendMessage, status, socket: wsRef.current };
}

export { useSocket };

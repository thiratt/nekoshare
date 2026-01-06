import type { IConnection, CommandHandler, TransportType } from "../types";
import type { PacketRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";
import { auth } from "@/core/auth";

/**
 * Register authentication handlers.
 * This is primarily used by TCP which requires explicit auth.
 * WebSocket is pre-authenticated via HTTP middleware.
 */
export function registerAuthHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleLoginRequest: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			if (client.isAuthenticated) {
				client.sendPacket(
					PacketType.AUTH_LOGIN_RESPONSE,
					(w) => {
						w.writeUInt8(1);
						w.writeString(client.user?.name ?? "");
					},
					requestId
				);
				return;
			}

			const oneTimeToken = reader.readString();

			if (!oneTimeToken) {
				client.sendPacket(
					PacketType.AUTH_LOGIN_RESPONSE,
					(w) => {
						w.writeUInt8(0);
						w.writeString("No session token provided");
					},
					requestId
				);
				client.shutdown();
				return;
			}

			const data = await auth.api.verifyOneTimeToken({
				body: { token: oneTimeToken },
			});

			if (!data.session || !data.user) {
				Logger.warn(transportType, `Authentication failed for client ${client.id}: Invalid session`);
				client.sendPacket(
					PacketType.AUTH_LOGIN_RESPONSE,
					(w) => {
						w.writeUInt8(0);
						w.writeString("Invalid or expired session");
					},
					requestId
				);
				client.shutdown();
				return;
			}

			client.setAuthenticated(data);
			client.sendPacket(
				PacketType.AUTH_LOGIN_RESPONSE,
				(w) => {
					w.writeUInt8(1);
					w.writeString(data.user.name);
				},
				requestId
			);

			Logger.info(transportType, `Client ${client.id} authenticated as ${data.user.name}`);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Authentication error for client ${client.id}: ${msg}`);
			client.sendPacket(
				PacketType.AUTH_LOGIN_RESPONSE,
				(w) => {
					w.writeUInt8(0);
					w.writeString("Authentication error");
				},
				requestId
			);
		}
	};

	router.register(PacketType.AUTH_LOGIN_REQUEST, handleLoginRequest);
	Logger.debug(transportType, "AuthController handlers registered");
}

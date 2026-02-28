import { Logger } from "@/infrastructure/logger";
import { PacketType } from "@workspace/contracts/ws";

import { PacketRouter } from "@/infrastructure/socket/runtime/packet-router";
import type { CommandHandler, IConnection, TransportType } from "@/infrastructure/socket/runtime/types";
import { authenticateClient, revokeOneTimeToken } from "./auth.service";

function sendLoginResponse(client: IConnection, requestId: number, ok: boolean, messageOrPayload: string): void {
	client.sendPacket(
		PacketType.AUTH_LOGIN_RESPONSE,
		(writer) => {
			writer.writeUInt8(ok ? 1 : 0);
			writer.writeString(messageOrPayload);
		},
		requestId,
	);
}

function sendTokenRevokeFailure(client: IConnection, requestId: number, message: string): void {
	client.sendPacket(
		PacketType.AUTH_TOKEN_REVOKE,
		(writer) => {
			writer.writeUInt8(0);
			writer.writeString(message);
		},
		requestId,
	);
}

export function registerAuthHandlers<T extends IConnection>(router: PacketRouter<T>, transportType: TransportType) {
	const handleLoginRequest: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const oneTimeToken = reader.readString();
			const result = await authenticateClient(client, oneTimeToken);

			if (!result.ok) {
				Logger.warn(transportType, `Authentication failed for client ${client.id}: ${result.message}`);
				sendLoginResponse(client, requestId, false, result.message);
				if (result.shouldShutdown) {
					client.shutdown();
				}
				return;
			}

			sendLoginResponse(
				client,
				requestId,
				true,
				JSON.stringify({
					id: result.user.id,
					name: result.user.name,
				}),
			);

			Logger.info(transportType, `Client ${client.id} authenticated as ${result.user.name ?? result.user.id}`);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Authentication error for client ${client.id}: ${msg}`);
			sendLoginResponse(client, requestId, false, "Authentication error");
			client.shutdown();
		}
	};

	const handleAuthTokenRevoke: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			const token = reader.readString();
			const result = await revokeOneTimeToken(client, token);
			if (!result.ok) {
				sendTokenRevokeFailure(client, requestId, result.message);
			}
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Token revoke error for client ${client.id}: ${msg}`);
			sendTokenRevokeFailure(client, requestId, "Error revoking refresh token");
		}
	};

	router.register(PacketType.AUTH_LOGIN_REQUEST, handleLoginRequest);
	router.register(PacketType.AUTH_TOKEN_REVOKE, handleAuthTokenRevoke);
	Logger.debug(transportType, "AuthController handlers registered");
}

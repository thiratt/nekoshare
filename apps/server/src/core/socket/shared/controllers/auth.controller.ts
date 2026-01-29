import type { IConnection, CommandHandler, TransportType } from "../types";
import type { PacketRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";
import { auth } from "@/core/auth";
import { db } from "@/adapters/db";
import { eq } from "drizzle-orm";
import { verification } from "@/adapters/db/schemas";

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
						const data = {
							id: client.user?.id,
							name: client.user?.name,
						};
						const payload = JSON.stringify(data);

						w.writeUInt8(1);
						w.writeString(payload);
					},
					requestId,
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
					requestId,
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
					requestId,
				);
				client.shutdown();
				return;
			}
			const deviceId = await db.query.device.findFirst({
				where: (devices) => eq(devices.userId, data.user.id),
			});

			if (!deviceId) {
				Logger.warn(transportType, `Authentication failed for client ${client.id}: Device not found`);
				client.sendPacket(
					PacketType.AUTH_LOGIN_RESPONSE,
					(w) => {
						w.writeUInt8(0);
						w.writeString("Associated device not found");
					},
					requestId,
				);
				client.shutdown();
				return;
			}

			const dataDto = {
				session: data.session,
				user: {
					...data.user,
					deviceId: deviceId.id,
				},
			};

			client.setAuthenticated(dataDto);
			client.sendPacket(
				PacketType.AUTH_LOGIN_RESPONSE,
				(w) => {
					const $data = {
						id: data.user.id,
						name: data.user.name,
					};
					const payload = JSON.stringify($data);

					w.writeUInt8(1);
					w.writeString(payload);
				},
				requestId,
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
				requestId,
			);

			client.shutdown();
		}
	};

	const handleAuthTokenRevoke: CommandHandler<T> = async (client, reader, requestId) => {
		try {
			if (!client.isAuthenticated || !client.user) {
				client.sendPacket(
					PacketType.AUTH_TOKEN_REVOKE,
					(w) => {
						w.writeUInt8(0);
						w.writeString("Not authenticated");
					},
					requestId,
				);
				return;
			}

			const token = reader.readString();
			if (!token) {
				return;
			}
			const tokenFormat = `one-time-token:${token}`;
			await db.delete(verification).where(eq(verification.identifier, tokenFormat)).execute();
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error(transportType, `Token revoke error for client ${client.id}: ${msg}`);
			client.sendPacket(
				PacketType.AUTH_TOKEN_REVOKE,
				(w) => {
					w.writeUInt8(0);
					w.writeString("Error revoking refresh token");
				},
				requestId,
			);
		}
	};

	router.register(PacketType.AUTH_LOGIN_REQUEST, handleLoginRequest);
	router.register(PacketType.AUTH_TOKEN_REVOKE, handleAuthTokenRevoke);
	Logger.debug(transportType, "AuthController handlers registered");
}

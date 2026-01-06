import { Connection } from "../connection";
import { BinaryReader } from "../binary-utils";
import { mainRouter } from "../router";
import { PacketType } from "../protocol";
import { Logger } from "@/core/logger";
import { auth } from "@/core/auth";

export class AuthController {
	static init() {
		mainRouter.register(PacketType.AUTH_LOGIN_REQUEST, AuthController.handleLoginRequest);
	}

	private static async handleLoginRequest(client: Connection, reader: BinaryReader, requestId: number) {
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
				Logger.warn("TCP", `Authentication failed for client ${client.id}: Invalid session`);
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

			Logger.info("TCP", `Client ${client.id} authenticated as ${data.user.name}`);
		} catch (error) {
			const msg = (error as Error).message;
			Logger.error("TCP", `Authentication error for client ${client.id}: ${msg}`);
			client.sendPacket(
				PacketType.AUTH_LOGIN_RESPONSE,
				(w) => {
					w.writeUInt8(0);
					// w.writeString("Authentication error: " + msg);
				},
				requestId
			);
		}
	}
}

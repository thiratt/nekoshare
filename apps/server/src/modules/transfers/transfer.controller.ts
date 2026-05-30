import { env } from "@/config/env";
import type { DeviceIdentityService } from "@/modules/devices";
import { handleControllerError, HttpServiceError, jsonSuccess } from "@/shared/http";
import type { AppContext } from "@/shared/http/router";

type TransferControllerService = {
	issueCallerRelayTicket(input: {
		deviceId: string;
		relayUrl: string;
		transferId: string;
		userId: string;
	}): Promise<unknown>;
};

function getRelayUrl(): string {
	const publicBaseUrl = env.APP_PUBLIC_URL ?? env.BETTER_AUTH_URL;
	const url = new URL("/ws/relay", publicBaseUrl);

	if (url.protocol === "http:") url.protocol = "ws:";
	if (url.protocol === "https:") url.protocol = "wss:";

	return url.toString();
}

export function createTransferController(service: TransferControllerService, deviceIdentity: DeviceIdentityService) {
	return {
		relayTicket: async (c: AppContext) => {
			try {
				const transferId = c.req.param("transferId")?.trim();
				if (!transferId) {
					throw new HttpServiceError("VALIDATION_ERROR", 400, "Transfer ID is required");
				}

				const session = c.get("session");
				const user = c.get("user");
				const explicitDeviceId = c.req.header("x-neko-device-id");
				const device = await deviceIdentity.resolveHttpDevice({
					explicitDeviceId,
					sessionId: session.id,
					userId: user.id,
				});
				if (!device) {
					if (explicitDeviceId?.trim()) {
						throw new HttpServiceError(
							"DEVICE_FORBIDDEN",
							403,
							"Requested device is not available for this user",
						);
					}

					throw new HttpServiceError("DEVICE_NOT_FOUND", 404, "Current session is not bound to a device");
				}

				const data = await service.issueCallerRelayTicket({
					transferId,
					userId: user.id,
					deviceId: device.deviceId,
					relayUrl: getRelayUrl(),
				});

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},
	};
}

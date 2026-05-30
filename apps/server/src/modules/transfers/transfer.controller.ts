import type { TransferHttpRepository } from "./transfer.service";

import { env } from "@/config/env";
import { readCachedDeviceIdBySessionId } from "@/modules/auth/lib/utils";
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

async function getCallerDeviceId(input: {
	explicitDeviceId?: string;
	repository: TransferHttpRepository;
	sessionId: string;
	userId: string;
}): Promise<string | undefined> {
	const explicitDeviceId = input.explicitDeviceId?.trim();
	if (explicitDeviceId) {
		const ownedDeviceId = await input.repository.findOwnedDeviceId(explicitDeviceId, input.userId);
		if (!ownedDeviceId) {
			throw new HttpServiceError("DEVICE_FORBIDDEN", 403, "Requested device is not available for this user");
		}

		return ownedDeviceId;
	}

	const cachedDeviceId = await readCachedDeviceIdBySessionId(input.sessionId);
	if (cachedDeviceId !== undefined) {
		return cachedDeviceId ?? undefined;
	}

	return input.repository.findDeviceIdBySessionId(input.sessionId);
}

export function createTransferController(service: TransferControllerService, repository: TransferHttpRepository) {
	return {
		relayTicket: async (c: AppContext) => {
			try {
				const transferId = c.req.param("transferId")?.trim();
				if (!transferId) {
					throw new HttpServiceError("VALIDATION_ERROR", 400, "Transfer ID is required");
				}

				const session = c.get("session");
				const user = c.get("user");
				const deviceId = await getCallerDeviceId({
					explicitDeviceId: c.req.header("x-neko-device-id"),
					repository,
					sessionId: session.id,
					userId: user.id,
				});
				if (!deviceId) {
					throw new HttpServiceError("DEVICE_NOT_FOUND", 404, "Current session is not bound to a device");
				}

				const data = await service.issueCallerRelayTicket({
					transferId,
					userId: user.id,
					deviceId,
					relayUrl: getRelayUrl(),
				});

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},
	};
}

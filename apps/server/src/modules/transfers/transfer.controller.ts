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

function getRelayUrl(c: AppContext): string {
	const origin = c.req.header("origin") ?? env.APP_PUBLIC_URL;
	const url = new URL("/ws/relay", origin);

	if (url.protocol === "http:") url.protocol = "ws:";
	if (url.protocol === "https:") url.protocol = "wss:";

	return url.toString();
}

async function getCallerDeviceId(sessionId: string, repository: TransferHttpRepository): Promise<string | undefined> {
	const cachedDeviceId = await readCachedDeviceIdBySessionId(sessionId);
	if (cachedDeviceId !== undefined) {
		return cachedDeviceId ?? undefined;
	}

	return repository.findDeviceIdBySessionId(sessionId);
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
				const deviceId = await getCallerDeviceId(session.id, repository);
				if (!deviceId) {
					throw new HttpServiceError("DEVICE_NOT_FOUND", 404, "Current session is not bound to a device");
				}

				const data = await service.issueCallerRelayTicket({
					transferId,
					userId: user.id,
					deviceId,
					relayUrl: getRelayUrl(c),
				});

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},
	};
}

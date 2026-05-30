import { RedisTransferRuntimeStore, type TransferRuntimeRedisClient } from "./redis-transfer-runtime-store";
import { transferHttpRepository } from "./transfer.repository";
import { createTransferRouter } from "./transfer.route";
import { createTransferService } from "./transfer.service";
import type { TransferLifecycle } from "./transfer.service";

import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import {
	ensureTransferParticipants,
	getTransferSessionForFallback,
	markTransferAccepted,
	registerTransferOffer,
	removeTransferSession,
	resolveTransferForAck,
} from "@/infrastructure/socket/modules/transfer/transfer.state";

const lifecycle: TransferLifecycle = {
	registerTransferOffer,
	ensureTransferParticipants,
	markTransferAccepted,
	removeTransferSession,
	resolveTransferForAck,
	getTransferSessionForFallback,
};

let service: ReturnType<typeof createTransferService> | null = null;

function getTransferService() {
	if (!service) {
		service = createTransferService({
			devices: {
				findSenderDevice: async () => undefined,
				findUserSummary: async () => undefined,
				findDeviceFingerprint: async () => undefined,
			},
			lifecycle,
			runtimeStore: new RedisTransferRuntimeStore(getRedisClient() as unknown as TransferRuntimeRedisClient),
			onRuntimeError(operation, error) {
				Logger.warn("Transfer", `Failed to ${operation}`, error);
			},
		});
	}

	return service;
}

export function createTransferModule() {
	return {
		service: getTransferService(),
		router: createTransferRouter(
			{
				issueCallerRelayTicket: (input) => getTransferService().issueCallerRelayTicket(input),
			},
			transferHttpRepository,
		),
	};
}

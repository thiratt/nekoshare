import { RedisTransferRuntimeStore, type TransferRuntimeRedisClient } from "./redis-transfer-runtime-store";
import { createTransferRouter } from "./transfer.route";
import { createTransferService } from "./transfer.service";
import type { TransferLifecycle } from "./transfer.service";

import { Logger } from "@/infrastructure/logger";
import { getRedisClient } from "@/infrastructure/redis";
import { deviceIdentityRepository, DeviceIdentityService } from "@/modules/devices";
import {
	ensureTransferParticipants,
	getTransferSessionForFallback,
	markTransferAccepted,
	registerTransferOffer,
	removeTransferSession,
	resolveTransferForAck,
} from "@/modules/transfers/adapters/control-ws/transfer.state";

const lifecycle: TransferLifecycle = {
	registerTransferOffer,
	ensureTransferParticipants,
	markTransferAccepted,
	removeTransferSession,
	resolveTransferForAck,
	getTransferSessionForFallback,
};

let service: ReturnType<typeof createTransferService> | null = null;
let deviceIdentityService: DeviceIdentityService | null = null;

function getTransferService() {
	if (!service) {
		service = createTransferService({
			devices: {
				findSenderDevice: async () => undefined,
				findTargetDevice: async () => undefined,
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

function getDeviceIdentityService() {
	if (!deviceIdentityService) {
		deviceIdentityService = new DeviceIdentityService(deviceIdentityRepository);
	}

	return deviceIdentityService;
}

export function createTransferModule() {
	return {
		service: getTransferService(),
		router: createTransferRouter(
			{
				issueCallerRelayTicket: (input) => getTransferService().issueCallerRelayTicket(input),
			},
			getDeviceIdentityService(),
		),
	};
}

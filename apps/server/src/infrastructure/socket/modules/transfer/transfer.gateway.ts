import type { ConnectionTarget } from "@/infrastructure/socket/routing";
import { resolveConnectionTargetByDeviceId, resolveConnectionTargetBySessionId } from "@/infrastructure/socket/routing";

export async function findConnectionTargetBySessionId(sessionId: string | null): Promise<ConnectionTarget | undefined> {
	return resolveConnectionTargetBySessionId(sessionId);
}

export async function findConnectionTargetByDeviceId(deviceId: string | null): Promise<ConnectionTarget | undefined> {
	return resolveConnectionTargetByDeviceId(deviceId);
}

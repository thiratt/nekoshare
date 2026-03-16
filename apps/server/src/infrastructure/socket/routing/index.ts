export type { ConnectionTarget } from "./connection-routing";
export {
	getLocalNodeId,
	registerConnectionRoute,
	resolveConnectionByDeviceId,
	resolveConnectionBySessionId,
	resolveConnectionTargetByDeviceId,
	resolveConnectionTargetBySessionId,
	shutdownConnectionRouting,
	unregisterConnectionRoute,
} from "./connection-routing";
export { initializePacketRelay, sendJsonPacketToConnectionTarget, shutdownPacketRelay } from "./packet-relay";

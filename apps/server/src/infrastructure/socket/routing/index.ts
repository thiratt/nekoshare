export {
	getLocalNodeId,
	registerConnectionRoute,
	resolveConnectionTargetByDeviceId,
	resolveConnectionTargetBySessionId,
	resolveConnectionByDeviceId,
	resolveConnectionBySessionId,
	shutdownConnectionRouting,
	unregisterConnectionRoute,
} from "./connection-routing";
export type { ConnectionTarget } from "./connection-routing";
export { initializePacketRelay, sendJsonPacketToConnectionTarget, shutdownPacketRelay } from "./packet-relay";

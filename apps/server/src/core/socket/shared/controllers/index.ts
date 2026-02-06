export { registerSystemHandlers } from "./sys.controller";
export { registerUserHandlers } from "./user.controller";
export { registerAuthHandlers } from "./auth.controller";
export { registerDeviceHandlers } from "./device.controller";
export { registerFileTransferHandlers } from "./file-transfer.controller";
export {
	registerPeerHandlers,
	handleDeviceSocketDisconnect,
	getPeerConnectionStats,
	getDeviceConnections,
	hasActiveConnection,
} from "./peer.controller";

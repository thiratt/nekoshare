export type {
	ActiveTransferTargetView,
	ActiveTransferView,
	TransferConnectionState,
	TransferDeliveryState,
	TransferDirection,
	TransferError,
	TransferProtocol,
	TransferRouteType,
} from "../transfer-model";
export type { HistoryTransfersController } from "./hooks/useHistoryTransfers";

export type HistoryTransferFilter = "all" | "active" | "failed";

export type HistoryPendingRemove = {
	ids: string[];
};

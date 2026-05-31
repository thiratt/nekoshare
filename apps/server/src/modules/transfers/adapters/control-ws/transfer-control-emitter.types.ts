import type {
	TransferAcceptedLegacyCompat,
	TransferOfferedLegacyCompat,
	TransferRejectedLegacyCompat,
} from "./legacy-file-packet.types";

import type { ConnectionTarget } from "@/infrastructure/socket/routing";
import type { TransferFailure } from "@/modules/transfers/domain";
import type { protocol } from "@workspace/contracts";
import type { PacketType } from "@workspace/contracts/ws";

export interface TransferControlEmitContext {
	targetConnection: ConnectionTarget;
	sendLegacyPacket(packetType: PacketType, payloadJson: string): Promise<boolean>;
}

export interface TransferOfferedEmission {
	event: protocol.TransferOfferedEventPayload;
	legacy: TransferOfferedLegacyCompat;
}

export interface TransferAcceptedEmission {
	event: protocol.TransferAcceptedEventPayload;
	legacy: TransferAcceptedLegacyCompat;
}

export interface TransferRejectedEmission {
	event: protocol.TransferRejectedEventPayload;
	legacy: TransferRejectedLegacyCompat;
}

export interface TransferFailureEmission {
	transferId: string;
	failure: TransferFailure;
}

export interface TransferProgressEmission {
	event: protocol.TransferProgressEventPayload;
}

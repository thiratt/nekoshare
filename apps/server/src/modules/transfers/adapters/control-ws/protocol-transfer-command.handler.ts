import {
	isControlPacketEnvelopeLike,
	mapProtocolTransferCommandEnvelope,
	parseProtocolTransferCommandEnvelope,
	type ProtocolTransferCommandMapping,
	type ProtocolTransferCommandRejection,
	shouldRouteProtocolTransferCommandEnvelope,
} from "./protocol-transfer-command.mapper";

import {
	canEmitProtocolPackets,
	createErrorEnvelope,
	sendProtocolControlPacket,
} from "@/infrastructure/socket/protocol";
import type { IConnection } from "@/infrastructure/socket/runtime/types";
import { protocol } from "@workspace/contracts";

export type ProtocolTransferCommandHandlerResult =
	| {
			ok: true;
			command: ProtocolTransferCommandMapping;
	  }
	| {
			ok: false;
			error: ProtocolTransferCommandRejection;
	  };

function getErrorType(envelope: protocol.ControlPacketEnvelope | undefined): protocol.ControlPacketType {
	if (
		envelope?.type === protocol.ControlPacketType.TRANSFER_OFFER ||
		envelope?.type === protocol.ControlPacketType.TRANSFER_ACCEPT ||
		envelope?.type === protocol.ControlPacketType.TRANSFER_REJECT ||
		envelope?.type === protocol.ControlPacketType.TRANSFER_CANCEL
	) {
		return envelope.type;
	}

	return protocol.ControlPacketType.TRANSFER_FAILED;
}

function emitProtocolCommandError(
	connection: IConnection,
	envelope: protocol.ControlPacketEnvelope | undefined,
	error: ProtocolTransferCommandRejection,
): void {
	sendProtocolControlPacket(
		connection,
		createErrorEnvelope(
			getErrorType(envelope),
			{
				code: error.code,
				message: error.message,
				retryable: false,
			},
			{
				traceId: envelope?.traceId,
				requestId: envelope?.requestId,
			},
		),
	);
}

export function handleProtocolTransferCommandEnvelope(
	connection: IConnection,
	envelope: protocol.ControlPacketEnvelope,
): ProtocolTransferCommandHandlerResult {
	if (!canEmitProtocolPackets(connection)) {
		return {
			ok: false,
			error: {
				code: "PROTOCOL_VIOLATION",
				message: "Connection has not opted into Protocol v1 control packets",
			},
		};
	}

	const mapped = mapProtocolTransferCommandEnvelope(connection, envelope);
	if (!mapped.ok) {
		emitProtocolCommandError(connection, envelope, mapped.error);
		return mapped;
	}

	// TODO(Step 19+): wire this mapped Protocol v1 command into the transfer
	// lifecycle/facade and emit resulting events through transfer-control-emitter.
	// Legacy FILE_* inbound compatibility remains the active default path.
	return {
		ok: true,
		command: mapped.value,
	};
}

export function handleProtocolTransferCommandJson(
	connection: IConnection,
	rawJson: string,
): ProtocolTransferCommandHandlerResult {
	const envelope = parseProtocolTransferCommandEnvelope(rawJson);
	if (!envelope) {
		const error = {
			code: "PROTOCOL_VIOLATION",
			message: "Invalid Protocol v1 transfer command envelope",
		};
		if (canEmitProtocolPackets(connection)) {
			emitProtocolCommandError(connection, undefined, error);
		}
		return {
			ok: false,
			error,
		};
	}

	if (!shouldRouteProtocolTransferCommandEnvelope(connection, envelope)) {
		if (canEmitProtocolPackets(connection) && isControlPacketEnvelopeLike(envelope)) {
			const mapped = mapProtocolTransferCommandEnvelope(connection, envelope);
			if (!mapped.ok) {
				emitProtocolCommandError(connection, envelope, mapped.error);
				return mapped;
			}
		}

		return {
			ok: false,
			error: {
				code: "PROTOCOL_VIOLATION",
				message: "Protocol v1 transfer command envelope is not routable",
			},
		};
	}

	return handleProtocolTransferCommandEnvelope(connection, envelope);
}

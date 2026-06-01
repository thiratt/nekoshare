import {
	CONTROL_PROTOCOL_ENVELOPE_PACKET_TYPE,
	createControlPacketEnvelope,
	createEventEnvelope,
	parseControlProtocolCapabilities,
} from "../src/infrastructure/socket/protocol";
import {
	handleProtocolTransferCommandEnvelope,
	handleProtocolTransferCommandJson,
	mapProtocolTransferCommandEnvelope,
} from "../src/modules/transfers/adapters/control-ws";
import type { BinaryWriter } from "../src/infrastructure/socket/protocol";
import type { IConnection } from "../src/infrastructure/socket/runtime/types";
import type { Session, User } from "../src/modules/auth/lib";
import type { ResolvedDeviceIdentity } from "../src/modules/devices";

import { protocol } from "@workspace/contracts";
import { PacketType } from "@workspace/contracts/ws";

type CapturedPacket = {
	type: number;
	payloadJson: string;
	requestId?: number;
};

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function createFakeConnection(protocolVersion?: string): { connection: IConnection; packets: CapturedPacket[] } {
	const protocolCapabilities = parseControlProtocolCapabilities({
		protocolVersion,
		features: protocolVersion === "1" ? "TRANSFER_PROTOCOL_V1" : undefined,
	});
	const packets: CapturedPacket[] = [];
	const connection: IConnection = {
		id: protocolVersion === "1" ? "dev-protocol-v1-inbound" : "dev-legacy-inbound",
		transportType: "WebSocket",
		isAuthenticated: true,
		user: null,
		userId: "user-dev",
		session: null,
		deviceIdentity: null,
		protocolCapabilities,
		setAuthenticated(_data: { deviceIdentity?: ResolvedDeviceIdentity; session: Session; user: User }) {
			// This dev utility only verifies inbound command scaffolding.
		},
		sendPacket(type: PacketType, payloadOrRequestId?: ((w: BinaryWriter) => void) | number, requestId?: number) {
			if (typeof payloadOrRequestId === "number") {
				packets.push({ type, payloadJson: "", requestId: payloadOrRequestId });
				return;
			}

			let payloadJson = "";
			payloadOrRequestId?.({
				writeString(value: string) {
					payloadJson = value;
				},
			} as BinaryWriter);
			packets.push({ type, payloadJson, requestId });
		},
		handleMessage(_data: Buffer | ArrayBuffer) {
			// Not needed for mapper/handler verification.
		},
		close() {
			// Not needed for mapper/handler verification.
		},
		shutdown() {
			// Not needed for mapper/handler verification.
		},
	};

	return { connection, packets };
}

function createCommandEnvelope<TData>(
	type: protocol.ControlPacketType,
	data: TData,
	options: { protocolVersion?: number; kind?: protocol.ControlPacketKind } = {},
): protocol.ControlPacketEnvelope<TData> {
	return createControlPacketEnvelope({
		kind: options.kind ?? protocol.ControlPacketKind.COMMAND,
		type,
		data,
		id: `dev-${type.toLowerCase()}`,
		traceId: "transfer-dev-inbound",
		requestId: "request-dev-inbound",
		sentAt: new Date(0).toISOString(),
	}) as protocol.ControlPacketEnvelope<TData> & { protocolVersion: number };
}

function withProtocolVersion<TData>(
	envelope: protocol.ControlPacketEnvelope<TData>,
	protocolVersion: number,
): protocol.ControlPacketEnvelope<TData> {
	return {
		...envelope,
		protocolVersion,
	} as protocol.ControlPacketEnvelope<TData>;
}

const offerCommand: protocol.TransferOfferCommandPayload = {
	transferId: "transfer-dev-inbound",
	senderDeviceId: "sender-device",
	receiverDeviceId: "receiver-device",
	mode: "AUTO",
	manifest: {
		id: "transfer-dev-inbound",
		items: [
			{
				id: "item-1",
				kind: "file",
				name: "dev.txt",
				size: 12,
			},
		],
		totalBytes: 12,
		createdAt: new Date(0).toISOString(),
	},
};

const acceptCommand: protocol.TransferAcceptCommandPayload = {
	transferId: "transfer-dev-inbound",
	receiverDeviceId: "receiver-device",
};

const rejectCommand: protocol.TransferRejectCommandPayload = {
	transferId: "transfer-dev-inbound",
	reason: "Rejected by dev verifier",
};

const cancelCommand: protocol.TransferCancelCommandPayload = {
	transferId: "transfer-dev-inbound",
	reason: "Cancelled by dev verifier",
};

const { connection: optedInConnection } = createFakeConnection("1");
const { connection: legacyConnection } = createFakeConnection();

const offerEnvelope = createCommandEnvelope(protocol.ControlPacketType.TRANSFER_OFFER, offerCommand);
const acceptEnvelope = createCommandEnvelope(protocol.ControlPacketType.TRANSFER_ACCEPT, acceptCommand);
const rejectEnvelope = createCommandEnvelope(protocol.ControlPacketType.TRANSFER_REJECT, rejectCommand);
const cancelEnvelope = createCommandEnvelope(protocol.ControlPacketType.TRANSFER_CANCEL, cancelCommand);

for (const [label, envelope, expectedType] of [
	["TRANSFER_OFFER", offerEnvelope, protocol.ControlPacketType.TRANSFER_OFFER],
	["TRANSFER_ACCEPT", acceptEnvelope, protocol.ControlPacketType.TRANSFER_ACCEPT],
	["TRANSFER_REJECT", rejectEnvelope, protocol.ControlPacketType.TRANSFER_REJECT],
	["TRANSFER_CANCEL", cancelEnvelope, protocol.ControlPacketType.TRANSFER_CANCEL],
] as const) {
	const result = mapProtocolTransferCommandEnvelope(optedInConnection, envelope);
	assert(result.ok, `expected ${label} to map successfully`);
	assert(result.value.type === expectedType, `expected ${label} mapped type to be preserved`);
	assert(result.value.command.transferId === "transfer-dev-inbound", `expected ${label} transferId to be preserved`);
}

const unsupportedVersion = mapProtocolTransferCommandEnvelope(optedInConnection, withProtocolVersion(offerEnvelope, 2));
assert(!unsupportedVersion.ok, "expected unsupported protocolVersion to be rejected");

const wrongKind = mapProtocolTransferCommandEnvelope(
	optedInConnection,
	createEventEnvelope(protocol.ControlPacketType.TRANSFER_OFFERED, {
		transferId: "transfer-dev-inbound",
		senderDeviceId: "sender-device",
		receiverDeviceId: "receiver-device",
	}),
);
assert(!wrongKind.ok, "expected non-COMMAND envelope to be rejected");

const invalidData = mapProtocolTransferCommandEnvelope(
	optedInConnection,
	createCommandEnvelope(protocol.ControlPacketType.TRANSFER_OFFER, {
		transferId: "transfer-dev-inbound",
	}),
);
assert(!invalidData.ok, "expected invalid command data to be rejected");

const unsupportedCommand = mapProtocolTransferCommandEnvelope(
	optedInConnection,
	createCommandEnvelope(protocol.ControlPacketType.DEVICE_REVOKED, {
		transferId: "transfer-dev-inbound",
	}),
);
assert(!unsupportedCommand.ok, "expected unsupported command type to be rejected");

const notOptedIn = mapProtocolTransferCommandEnvelope(legacyConnection, offerEnvelope);
assert(!notOptedIn.ok, "expected legacy/default connection to reject Protocol v1 inbound command");

const handlerSuccess = handleProtocolTransferCommandEnvelope(optedInConnection, offerEnvelope);
assert(handlerSuccess.ok, "expected handler to accept valid opted-in Protocol v1 command");
assert(handlerSuccess.command.type === protocol.ControlPacketType.TRANSFER_OFFER, "expected handler command type");

const invalidHandlerConnection = createFakeConnection("1");
const handlerInvalidJson = handleProtocolTransferCommandJson(invalidHandlerConnection.connection, "{not-json");
assert(!handlerInvalidJson.ok, "expected invalid JSON handler input to be rejected");
assert(invalidHandlerConnection.packets.length === 1, "expected invalid JSON to emit one Protocol v1 error envelope");
assert(
	invalidHandlerConnection.packets[0]?.type === CONTROL_PROTOCOL_ENVELOPE_PACKET_TYPE,
	"expected invalid JSON error to use Protocol v1 envelope carrier",
);

const errorEnvelope = JSON.parse(
	invalidHandlerConnection.packets[0]?.payloadJson ?? "{}",
) as protocol.ControlPacketEnvelope<protocol.ControlErrorPayload>;
assert(errorEnvelope.protocolVersion === 1, "expected error envelope protocolVersion=1");
assert(errorEnvelope.kind === protocol.ControlPacketKind.ERROR, "expected error envelope kind=ERROR");
assert(errorEnvelope.data.code === "PROTOCOL_VIOLATION", "expected Protocol v1 error code");

const legacyHandlerConnection = createFakeConnection();
const legacyHandlerResult = handleProtocolTransferCommandEnvelope(legacyHandlerConnection.connection, offerEnvelope);
assert(!legacyHandlerResult.ok, "expected handler to reject non-opted-in connection");
assert(legacyHandlerConnection.packets.length === 1, "expected non-opted-in rejection to emit one error envelope");

console.log("Protocol v1 inbound command dev check passed.");
console.log(
	JSON.stringify(
		{
			acceptedTypes: [
				protocol.ControlPacketType.TRANSFER_OFFER,
				protocol.ControlPacketType.TRANSFER_ACCEPT,
				protocol.ControlPacketType.TRANSFER_REJECT,
				protocol.ControlPacketType.TRANSFER_CANCEL,
			],
			rejectedCases: [
				"unsupported protocolVersion",
				"non-COMMAND kind",
				"invalid data",
				"unsupported command type",
				"not opted in",
			],
			errorEnvelopeType: errorEnvelope.type,
		},
		null,
		2,
	),
);

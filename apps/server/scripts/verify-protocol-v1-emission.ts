import {
	canEmitProtocolPackets,
	CONTROL_PROTOCOL_ENVELOPE_PACKET_TYPE,
	createEventEnvelope,
	createResultEnvelope,
	parseControlProtocolCapabilities,
	shouldEmitLegacyFilePackets,
} from "../src/infrastructure/socket/protocol";
import { emitTransferOffered } from "../src/modules/transfers/adapters/control-ws";
import type { BinaryWriter } from "../src/infrastructure/socket/protocol";
import type { ConnectionTarget } from "../src/infrastructure/socket/routing";
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

const capabilities = parseControlProtocolCapabilities({
	protocolVersion: "1",
	features: "TRANSFER_PROTOCOL_V1",
});

assert(capabilities.protocolVersion === 1, "expected Protocol v1 capability version");
assert(capabilities.supportsProtocolPackets === true, "expected Protocol v1 packet support");
assert(capabilities.supportsLegacyFilePackets === true, "expected legacy FILE_* compatibility to remain enabled");
assert(canEmitProtocolPackets({ protocolCapabilities: capabilities }), "expected Protocol v1 emission to be allowed");
assert(
	shouldEmitLegacyFilePackets({ protocolCapabilities: capabilities }),
	"expected legacy FILE_* emission to remain allowed",
);

const eventEnvelope = createEventEnvelope(
	protocol.ControlPacketType.TRANSFER_OFFERED,
	{
		transferId: "transfer-dev-check",
		senderDeviceId: "sender-device",
		receiverDeviceId: "receiver-device",
	},
	{ traceId: "transfer-dev-check" },
);

assert(eventEnvelope.protocolVersion === protocol.NEKO_PROTOCOL_VERSION, "expected Protocol v1 envelope version");
assert(eventEnvelope.kind === protocol.ControlPacketKind.EVENT, "expected event envelope kind");
assert(eventEnvelope.type === protocol.ControlPacketType.TRANSFER_OFFERED, "expected transfer offered event type");
assert(eventEnvelope.traceId === "transfer-dev-check", "expected traceId to be preserved");

const resultEnvelope = createResultEnvelope(
	protocol.ControlPacketType.TRANSFER_ACCEPT,
	{ transferId: "transfer-dev-check", accepted: true },
	{ requestId: 42 },
);

assert(resultEnvelope.kind === protocol.ControlPacketKind.RESULT, "expected result envelope kind");
assert(resultEnvelope.requestId === "42", "expected numeric requestId to be stringified");

const capturedPackets: CapturedPacket[] = [];
const connection: IConnection = {
	id: "dev-protocol-v1-connection",
	transportType: "WebSocket",
	isAuthenticated: true,
	user: null,
	userId: "user-dev",
	session: null,
	deviceIdentity: null,
	protocolCapabilities: capabilities,
	setAuthenticated(_data: { deviceIdentity?: ResolvedDeviceIdentity; session: Session; user: User }) {
		// This dev utility only verifies outbound emission.
	},
	sendPacket(type: PacketType, payloadOrRequestId?: ((w: BinaryWriter) => void) | number, requestId?: number) {
		if (typeof payloadOrRequestId === "number") {
			capturedPackets.push({ type, payloadJson: "", requestId: payloadOrRequestId });
			return;
		}

		let payloadJson = "";
		payloadOrRequestId?.({
			writeString(value: string) {
				payloadJson = value;
			},
		} as BinaryWriter);
		capturedPackets.push({ type, payloadJson, requestId });
	},
	handleMessage(_data: Buffer | ArrayBuffer) {
		// Not needed for outbound emission verification.
	},
	close() {
		// Not needed for outbound emission verification.
	},
	shutdown() {
		// Not needed for outbound emission verification.
	},
};

const targetConnection: ConnectionTarget = {
	kind: "local",
	nodeId: "dev-node",
	transport: "WebSocket",
	connectionId: connection.id,
	connection,
};

const legacyPackets: CapturedPacket[] = [];
const delivered = await emitTransferOffered(
	{
		targetConnection,
		async sendLegacyPacket(packetType, payloadJson) {
			legacyPackets.push({ type: packetType, payloadJson });
			return true;
		},
	},
	{
		event: {
			transferId: "transfer-dev-check",
			senderDeviceId: "sender-device",
			receiverDeviceId: "receiver-device",
		},
		legacy: {
			senderDeviceFingerprint: "fingerprint-dev",
			senderDeviceName: "Dev Sender",
			senderUserId: "user-dev",
			senderUserName: "Dev User",
			files: [{ name: "dev.txt", size: 12, extension: "txt" }],
		},
	},
);

assert(delivered, "expected legacy FILE_* delivery to remain true");
assert(capturedPackets.length === 1, "expected one Protocol v1 envelope packet");
assert(
	capturedPackets[0]?.type === CONTROL_PROTOCOL_ENVELOPE_PACKET_TYPE,
	"expected Protocol v1 envelope carrier packet",
);
assert(legacyPackets.length === 1, "expected one legacy FILE_* compatibility packet");
assert(legacyPackets[0]?.type === PacketType.FILE_OFFER, "expected legacy FILE_OFFER compatibility packet");

const emittedEnvelope = JSON.parse(capturedPackets[0]?.payloadJson ?? "{}") as protocol.ControlPacketEnvelope;
assert(emittedEnvelope.protocolVersion === 1, "expected emitted envelope protocolVersion=1");
assert(emittedEnvelope.kind === protocol.ControlPacketKind.EVENT, "expected emitted envelope kind=EVENT");
assert(
	emittedEnvelope.type === protocol.ControlPacketType.TRANSFER_OFFERED,
	"expected emitted TRANSFER_OFFERED envelope",
);

const legacyPayload = JSON.parse(legacyPackets[0]?.payloadJson ?? "{}") as Record<string, unknown>;
assert(legacyPayload.transferId === "transfer-dev-check", "expected legacy transferId to remain unchanged");
assert(legacyPayload.senderDeviceId === "sender-device", "expected legacy senderDeviceId to remain unchanged");

console.log("Protocol v1 capability and emission dev check passed.");
console.log(
	JSON.stringify(
		{
			capabilities,
			protocolEnvelopeType: emittedEnvelope.type,
			legacyPacketType: legacyPackets[0]?.type,
		},
		null,
		2,
	),
);

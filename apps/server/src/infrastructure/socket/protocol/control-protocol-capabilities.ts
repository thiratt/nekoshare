export const CONTROL_PROTOCOL_LEGACY_VERSION = 0;
export const CONTROL_PROTOCOL_V1_VERSION = 1;
export const CONTROL_PROTOCOL_V1_FEATURE = "TRANSFER_PROTOCOL_V1";

export interface ControlProtocolCapabilities {
	protocolVersion: number;
	supportsProtocolPackets: boolean;
	supportsLegacyFilePackets: boolean;
	requestedFeatures: string[];
}

export const DEFAULT_CONTROL_PROTOCOL_CAPABILITIES: ControlProtocolCapabilities = {
	protocolVersion: CONTROL_PROTOCOL_LEGACY_VERSION,
	supportsProtocolPackets: false,
	supportsLegacyFilePackets: true,
	requestedFeatures: [],
};

export interface ParseControlProtocolCapabilitiesInput {
	protocolVersion?: string | null;
	features?: string | null;
}

export function parseControlProtocolCapabilities(
	input: ParseControlProtocolCapabilitiesInput,
): ControlProtocolCapabilities {
	const requestedVersion = Number.parseInt(input.protocolVersion ?? "", 10);
	const requestedFeatures = parseFeatureList(input.features);
	const supportsProtocolV1 =
		requestedVersion >= CONTROL_PROTOCOL_V1_VERSION || requestedFeatures.includes(CONTROL_PROTOCOL_V1_FEATURE);

	if (!supportsProtocolV1) {
		return DEFAULT_CONTROL_PROTOCOL_CAPABILITIES;
	}

	return {
		protocolVersion: CONTROL_PROTOCOL_V1_VERSION,
		supportsProtocolPackets: true,
		supportsLegacyFilePackets: true,
		requestedFeatures,
	};
}

export function canEmitProtocolPackets(input: { protocolCapabilities?: ControlProtocolCapabilities | null }): boolean {
	return input.protocolCapabilities?.supportsProtocolPackets === true;
}

export function shouldEmitLegacyFilePackets(input: {
	protocolCapabilities?: ControlProtocolCapabilities | null;
}): boolean {
	return input.protocolCapabilities?.supportsLegacyFilePackets !== false;
}

function parseFeatureList(value: string | null | undefined): string[] {
	if (!value) {
		return [];
	}

	return value
		.split(",")
		.map((feature) => feature.trim())
		.filter(Boolean);
}

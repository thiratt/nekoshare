export interface FileOfferPacketInput {
	transferId?: string;
	fromDeviceId?: string;
	toDeviceId?: string;
	files?: {
		name: string;
		size: number;
		extension: string;
	}[];
}

export interface FileAcceptPacketInput {
	transferId?: string;
	senderDeviceId?: string;
	address?: string;
	port?: number;
}

export interface FileRejectPacketInput {
	transferId?: string;
	senderDeviceId?: string;
	receiverDeviceId?: string;
	reason?: string;
}

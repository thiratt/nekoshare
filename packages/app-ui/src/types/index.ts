export type LinkComponentProps = {
	to: string;
	children: React.ReactNode;
	className?: string;
};
export type LinkComponent = React.ComponentType<LinkComponentProps>;

export interface IncludeLinkComponentProps {
	linkComponent: LinkComponent;
}

export type ParticipantKind = "device" | "buddy";

export interface Participant {
	id: string;
	kind: ParticipantKind;
	name: string;
}

export interface ContentDetail {
	id: string;
	name: string;
	type: "file" | "text";
	size: number; // bytes
	uploadedAt: string; // ISO
	algorithm: "AES-256-GCM"; // default for now
	checksum: string; // sha256 hex
	published: boolean; // one-way
	participants: Participant[] | null; // null => public (everyone with the link)
	views: number;
	downloads: number;
}

export interface PublishInfo {
	url: string;
	expiresAt: number; // epoch ms
	expired: boolean;
}

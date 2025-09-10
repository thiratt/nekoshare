import * as React from "react";
import type { ContentDetail, Participant, PublishInfo } from "@workspace/app-ui/types";

const seedParticipants: Participant[] = [
	{ id: "dev-1", kind: "device", name: "Acer Nitro v15" },
	{ id: "dev-2", kind: "device", name: "Redmi Note 12" },
	{ id: "dev-3", kind: "device", name: "Chrome 136" },
	{ id: "dev-4", kind: "device", name: "Edge 139" },
	{ id: "dev-5", kind: "device", name: "Asus TUF F15" },
	{ id: "bud-1", kind: "buddy", name: "alex@example.com" },
	{ id: "bud-2", kind: "buddy", name: "mina@example.com" },
];

export function useContentDetail() {
	const [content, setContent] = React.useState<ContentDetail | null>(null);
	const [participants] = React.useState<Participant[]>(seedParticipants);
	const [uploading, setUploading] = React.useState(false);

	const [publishInfo, setPublishInfo] = React.useState<PublishInfo | null>(null);

	// auto expire tick
	React.useEffect(() => {
		if (!publishInfo || publishInfo.expired) return;
		const id = window.setInterval(() => {
			if (Date.now() >= publishInfo.expiresAt) {
				setPublishInfo((p) => (p ? { ...p, expired: true } : p));
			}
		}, 1000);
		return () => window.clearInterval(id);
	}, [publishInfo]);

	// ---- upload (file or text) ----
	const uploadText = React.useCallback(
		async (payload: { name: string; text: string }) => {
			setUploading(true);
			try {
				const enc = new TextEncoder();
				const bytes = enc.encode(payload.text);
				const hashBuf = await crypto.subtle.digest("SHA-256", bytes);
				const checksum = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

				const meta: ContentDetail = {
					id: crypto.randomUUID(),
					name: payload.name?.trim() || "untitled.txt",
					type: "text",
					size: bytes.byteLength,
					uploadedAt: new Date().toISOString(),
					algorithm: "AES-256-GCM",
					checksum,
					published: false,
					// auto-check all participants on upload
					participants: [...participants],
					views: 0,
					downloads: 0,
				};
				setContent(meta);
				setPublishInfo(null);
			} catch (e) {
				console.log(e);
			} finally {
				setUploading(false);
			}
		},
		[participants]
	);

	const uploadFile = React.useCallback(
		async (payload: { file: File }) => {
			setUploading(true);
			try {
				const buf = await payload.file.arrayBuffer();
				const hashBuf = await crypto.subtle.digest("SHA-256", buf);
				const checksum = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

				const meta: ContentDetail = {
					id: crypto.randomUUID(),
					name: payload.file.name,
					type: "file",
					size: payload.file.size,
					uploadedAt: new Date().toISOString(),
					algorithm: "AES-256-GCM",
					checksum,
					published: false,
					// auto-check all participants on upload
					participants: [...participants],
					views: 0,
					downloads: 0,
				};
				setContent(meta);
				setPublishInfo(null);
			} finally {
				setUploading(false);
			}
		},
		[participants]
	);

	// manage participants (blocked after publish)
	const setParticipants = React.useCallback((next: Participant[]) => {
		setContent((c) => (c && !c.published ? { ...c, participants: next } : c));
	}, []);

	// publish with TTL (1-10 min). One-way, sets participants: null (public).
	const publishWithTTL = React.useCallback(
		async (ttlSeconds: number): Promise<string | null> => {
			if (!content) return null;
			if (content.published && publishInfo?.url) return publishInfo.url;

			const ttl = Math.min(10 * 60, Math.max(60, Math.floor(ttlSeconds))); // clamp 1–10 min
			const expiresAt = Date.now() + ttl * 1000;

			const token = crypto.randomUUID().replace(/-/g, "");
			const url = `${window.location.origin}/public/${content.id}?t=${token}&exp=${expiresAt}`;

			// one-way publish, public access
			setContent({ ...content, published: true, participants: null });

			setPublishInfo({ url, expiresAt, expired: false });
			return url;
		},
		[content, publishInfo]
	);

	// remove content
	const remove = React.useCallback(() => {
		setPublishInfo(null);
		setContent(null);
	}, []);

	// derived for UI
	const publicUrl = publishInfo?.url ?? null;
	const expiresAt = publishInfo?.expiresAt ?? null;
	const isExpired = Boolean(publishInfo?.expired);
	const timeLeftMs = React.useMemo(
		() => (publishInfo ? Math.max(0, publishInfo.expiresAt - Date.now()) : 0),
		[publishInfo]
	);

	return {
		// data
		content,
		participants,
		uploading,
		publicUrl,
		expiresAt,
		isExpired,
		timeLeftMs,
		// actions
		uploadText,
		uploadFile,
		setParticipants,
		publishWithTTL,
		remove,
	};
}

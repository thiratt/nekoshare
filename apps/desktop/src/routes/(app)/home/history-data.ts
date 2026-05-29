import { generateHistoryStableId } from "@workspace/app-ui/components/ui/history/index";
import type { HistoryFileData } from "@workspace/app-ui/types/history";

import type { TransferRecord } from "@/lib/store/transfers";

const TRANSFER_GROUP_PREFIX = "transfer:";

export function getTransferGroupKey(transferId: string): string {
	return `${TRANSFER_GROUP_PREFIX}${transferId}`;
}

export function readTransferIdFromGroupKey(stableKey?: string): string | null {
	if (!stableKey?.startsWith(TRANSFER_GROUP_PREFIX)) {
		return null;
	}

	return stableKey.slice(TRANSFER_GROUP_PREFIX.length);
}

export function findHistoryItemById(items: HistoryFileData[], id: number): HistoryFileData | undefined {
	return items.find((item) => generateHistoryStableId(item.stableKey ?? item.path) === id);
}

export function buildHistoryData(records: TransferRecord[]): HistoryFileData[] {
	const grouped = new Map<string, TransferRecord[]>();

	for (const record of records) {
		const bucket = grouped.get(record.transferId);
		if (bucket) {
			bucket.push(record);
		} else {
			grouped.set(record.transferId, [record]);
		}
	}

	const rows: HistoryFileData[] = [];

	for (const [transferId, transferRecords] of grouped) {
		const ordered = [...transferRecords].sort((a, b) => b.updatedAtMs - a.updatedAtMs);

		if (ordered.length === 1) {
			rows.push(createSingleFileHistoryRow(ordered[0]));
			continue;
		}

		rows.push(createGroupedHistoryRow(transferId, ordered));
	}

	rows.sort((a, b) => (b.modifiedAt?.getTime() ?? 0) - (a.modifiedAt?.getTime() ?? 0));
	return rows;
}

function createSingleFileHistoryRow(record: TransferRecord): HistoryFileData {
	return {
		stableKey: record.fileId,
		name: record.fileName,
		path: record.filePath,
		size: record.totalBytes,
		isFile: true,
		isDirectory: false,
		createdAt: new Date(record.startedAtMs),
		modifiedAt: new Date(record.updatedAtMs),
		accessedAt: null,
		transfer: {
			status: record.status,
			transferId: record.transferId,
			direction: record.direction,
			progressPercent: record.progressPercent,
			...resolveLabels(record),
			error: record.error,
			updatedAt: new Date(record.updatedAtMs).toISOString(),
		},
	};
}

function createGroupedHistoryRow(transferId: string, records: TransferRecord[]): HistoryFileData {
	const representative = records[0];
	const status = resolveGroupedStatus(records);
	const totalBytes = records.reduce((sum, record) => sum + record.totalBytes, 0);
	const sentBytes = records.reduce(
		(sum, record) => sum + Math.max(0, Math.min(record.sentBytes, record.totalBytes)),
		0,
	);
	const progressPercent =
		status === "success"
			? 100
			: totalBytes > 0
				? clampPercent((sentBytes / totalBytes) * 100)
				: clampPercent(representative.progressPercent);
	const updatedAtMs = Math.max(...records.map((record) => record.updatedAtMs));
	const createdAtMs = Math.min(...records.map((record) => record.startedAtMs));
	const error =
		records.find((record) => record.status === "failed" && record.error?.length)?.error ?? null;

	return {
		stableKey: getTransferGroupKey(transferId),
		name: resolveGroupedName(representative.direction, status, records.length),
		path: `transfer://${transferId}`,
		size: totalBytes,
		isFile: false,
		isDirectory: false,
		createdAt: new Date(createdAtMs),
		modifiedAt: new Date(updatedAtMs),
		accessedAt: null,
		transfer: {
			status,
			transferId,
			direction: representative.direction,
			progressPercent,
			...resolveLabels(representative),
			error,
			updatedAt: new Date(updatedAtMs).toISOString(),
		},
	};
}

function resolveLabels(record: TransferRecord) {
	if (record.direction === "send" || record.sameAccount) {
		return {
			fromIsMe: true,
			fromLabel: "ฉัน",
			deviceLabel: record.sourceDeviceName ?? null,
		};
	}

	return {
		fromIsMe: false,
		fromLabel: record.sourceUserName ?? "Unknown",
		deviceLabel: null,
	};
}

function resolveGroupedStatus(records: TransferRecord[]): TransferRecord["status"] {
	if (records.some((record) => record.status === "processing")) {
		return "processing";
	}

	if (records.some((record) => record.status === "failed")) {
		return "failed";
	}

	return "success";
}

function resolveGroupedName(
	direction: "send" | "receive",
	status: TransferRecord["status"],
	fileCount: number,
): string {
	if (direction === "receive") {
		if (status === "processing") return `กำลังรับ ${fileCount} ไฟล์`;
		if (status === "failed") return `รับไม่สำเร็จ ${fileCount} ไฟล์`;
		return `ได้รับไฟล์ ${fileCount} ไฟล์`;
	}

	if (status === "processing") return `กำลังส่ง ${fileCount} ไฟล์`;
	if (status === "failed") return `ส่งไม่สำเร็จ ${fileCount} ไฟล์`;
	return `ส่งไฟล์ ${fileCount} ไฟล์`;
}

function clampPercent(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}

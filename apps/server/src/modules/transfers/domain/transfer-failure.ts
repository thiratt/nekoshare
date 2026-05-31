import type { ContentfulStatusCode } from "hono/utils/http-status";

import { isRetryableTransferError, TransferErrorCode, type TransferErrorCode as TransferErrorCodeValue } from "./transfer-error-code";
import { RuntimeTransferEventType } from "./transfer-status-event";

import { HttpServiceError } from "@/shared/http";
import type { TransferRuntimeEvent } from "@/modules/transfers/transfer.types";

export interface TransferFailure {
	code: TransferErrorCodeValue;
	message: string;
	retryable: boolean;
	details?: unknown;
}

export function createTransferFailure(
	code: TransferErrorCodeValue,
	message: string,
	options: { details?: unknown; retryable?: boolean } = {},
): TransferFailure {
	return {
		code,
		message,
		retryable: options.retryable ?? isRetryableTransferError(code),
		details: options.details,
	};
}

export function mapTransferFailureToHttpError(
	failure: TransferFailure,
	status?: ContentfulStatusCode,
): HttpServiceError {
	return new HttpServiceError(failure.code, status ?? getDefaultHttpStatus(failure.code), failure.message);
}

export function mapTransferFailureToLegacySocketError(failure: TransferFailure): { message: string; code: string } {
	return {
		code: failure.code,
		message: failure.message,
	};
}

export function mapUnknownErrorToTransferFailure(error: unknown): TransferFailure {
	if (isTransferFailure(error)) {
		return error;
	}

	const message = error instanceof Error ? error.message : "Unknown error";
	return createTransferFailure(classifyLegacyTransferError(message), message);
}

export function mapTransferFailureToRuntimeEvent(
	transferId: string,
	failure: TransferFailure,
	input: Omit<TransferRuntimeEvent, "id" | "transferId" | "type" | "createdAt" | "errorCode" | "message"> = {},
): Omit<TransferRuntimeEvent, "id" | "createdAt"> & { failure: TransferFailure } {
	return {
		transferId,
		type: RuntimeTransferEventType.TRANSFER_FAILED,
		...input,
		message: failure.message,
		failure,
	};
}

function isTransferFailure(value: unknown): value is TransferFailure {
	if (!value || typeof value !== "object") {
		return false;
	}

	const record = value as Partial<TransferFailure>;
	return typeof record.code === "string" && typeof record.message === "string" && typeof record.retryable === "boolean";
}

function classifyLegacyTransferError(message: string): TransferErrorCodeValue {
	if (
		message.includes("does not match an active transfer session") ||
		message.includes("does not match an accepted transfer session")
	) {
		return TransferErrorCode.TRANSFER_NOT_FOUND;
	}

	if (
		message.includes("Unauthorized") ||
		message.includes("not part of this transfer") ||
		message.includes("not available for this user")
	) {
		return TransferErrorCode.TRANSFER_FORBIDDEN;
	}

	if (
		message.includes("Invalid") ||
		message.includes("Malformed") ||
		message.includes("payload") ||
		message.includes("protocol")
	) {
		return TransferErrorCode.PROTOCOL_VIOLATION;
	}

	if (message.includes("not connected") || message.includes("unreachable") || message.includes("offline")) {
		return TransferErrorCode.DEVICE_OFFLINE;
	}

	if (message.includes("not ready")) {
		return TransferErrorCode.TRANSPORT_NOT_READY;
	}

	if (message.includes("disconnected")) {
		return TransferErrorCode.TRANSPORT_DISCONNECTED;
	}

	return TransferErrorCode.INTERNAL_ERROR;
}

function getDefaultHttpStatus(code: TransferErrorCodeValue): ContentfulStatusCode {
	switch (code) {
		case TransferErrorCode.TRANSFER_NOT_FOUND:
			return 404;
		case TransferErrorCode.TRANSFER_FORBIDDEN:
		case TransferErrorCode.DEVICE_REVOKED:
			return 403;
		case TransferErrorCode.TRANSFER_INVALID_STATE:
		case TransferErrorCode.TRANSFER_EXPIRED:
		case TransferErrorCode.RELAY_TICKET_EXPIRED:
			return 409;
		case TransferErrorCode.PAYLOAD_TOO_LARGE:
			return 413;
		case TransferErrorCode.PROTOCOL_VIOLATION:
		case TransferErrorCode.RELAY_TICKET_INVALID:
			return 400;
		default:
			return 500;
	}
}

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

import { createRuntimeEvent, nowIso } from "./transfer-runtime.service";
import type {
	IssuedTransferRelayTicket,
	StoredTransferRelayTicket,
	TransferParticipant,
	TransferParticipantRole,
	TransferRelayTicket,
	VerifiedTransferRelayTicket,
} from "../transfer.types";
import type { TransferRuntimeStore } from "../transfer-runtime-store";

import { HttpServiceError } from "@/shared/http";

export interface IssueRelayTicketsInput {
	transferId: string;
	sender: TransferParticipant;
	receiver: TransferParticipant;
	byteLimit: number;
	ttlSeconds?: number;
}

export interface IssuedTransferRelayTickets {
	sender: IssuedTransferRelayTicket;
	receiver: IssuedTransferRelayTicket;
}

export interface RelayTicketResponse {
	relayUrl: string;
	token: string;
	ticket: IssuedTransferRelayTicket["ticket"];
}

export interface RelayTicketServiceDependencies {
	runtimeStore?: TransferRuntimeStore;
}

function hashRelayTicketToken(token: string): string {
	return createHash("sha256").update(token).digest("base64url");
}

function createRelayToken(ticketId: string): string {
	return `${ticketId}.${randomBytes(32).toString("base64url")}`;
}

function parseRelayTicketId(token: string): string | undefined {
	const [ticketId, secret, extra] = token.split(".");
	if (!ticketId || !secret || extra !== undefined) {
		return undefined;
	}

	return ticketId;
}

function isSameHash(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function toPublicRelayTicket(ticket: StoredTransferRelayTicket): TransferRelayTicket {
	return {
		id: ticket.id,
		transferId: ticket.transferId,
		role: ticket.role,
		userId: ticket.userId,
		deviceId: ticket.deviceId,
		issuer: ticket.issuer,
		transport: ticket.transport,
		byteLimit: ticket.byteLimit,
		issuedAt: ticket.issuedAt,
		expiresAt: ticket.expiresAt,
	};
}

function createStoredRelayTicket(
	transferId: string,
	role: TransferParticipantRole,
	participant: TransferParticipant,
	byteLimit: number,
	ttlSeconds: number,
	issuedAt: string,
	expiresAt: string,
): { token: string; ticket: StoredTransferRelayTicket } {
	const ticketId = randomUUID();
	const token = createRelayToken(ticketId);
	return {
		token,
		ticket: {
			id: ticketId,
			transferId,
			role,
			userId: participant.userId,
			deviceId: participant.deviceId,
			issuer: "server",
			transport: "relay",
			byteLimit,
			issuedAt,
			expiresAt,
			tokenHash: hashRelayTicketToken(token),
			ttlSeconds,
		},
	};
}

export function createRelayTicketService(deps: RelayTicketServiceDependencies) {
	async function issueRelayTickets(input: IssueRelayTicketsInput): Promise<IssuedTransferRelayTickets> {
		if (!deps.runtimeStore) {
			throw new Error("Transfer runtime store is required to issue relay tickets");
		}

		if (!input.transferId || input.byteLimit <= 0 || !Number.isFinite(input.byteLimit)) {
			throw new Error("Invalid relay ticket request");
		}

		const issuedAt = nowIso();
		const expiresAt = new Date(Date.now() + (input.ttlSeconds ?? 10 * 60) * 1000).toISOString();
		const ttlSeconds = input.ttlSeconds ?? 10 * 60;

		const senderTicket = createStoredRelayTicket(
			input.transferId,
			"sender",
			input.sender,
			input.byteLimit,
			ttlSeconds,
			issuedAt,
			expiresAt,
		);
		const receiverTicket = createStoredRelayTicket(
			input.transferId,
			"receiver",
			input.receiver,
			input.byteLimit,
			ttlSeconds,
			issuedAt,
			expiresAt,
		);

		await deps.runtimeStore.addRelayTicket(senderTicket.ticket);
		await deps.runtimeStore.addRelayTicket(receiverTicket.ticket);
		await deps.runtimeStore.addEvent(
			createRuntimeEvent(input.transferId, "relay-ticket-issued", {
				transport: "relay",
				transportState: "ticket-issued",
				message: "Relay tickets issued",
			}),
		);

		const runtime = await deps.runtimeStore.getRuntime(input.transferId);
		if (runtime) {
			await deps.runtimeStore.saveRuntime({
				...runtime,
				transport: "relay",
				transportState: "ticket-issued",
				updatedAt: nowIso(),
			});
		}

		return {
			sender: {
				token: senderTicket.token,
				ticket: toPublicRelayTicket(senderTicket.ticket),
			},
			receiver: {
				token: receiverTicket.token,
				ticket: toPublicRelayTicket(receiverTicket.ticket),
			},
		};
	}

	return {
		issueRelayTickets,

		async verifyRelayTicket(token: string): Promise<VerifiedTransferRelayTicket | undefined> {
			if (!deps.runtimeStore) {
				throw new Error("Transfer runtime store is required to verify relay tickets");
			}

			const ticketId = parseRelayTicketId(token);
			if (!ticketId) {
				return undefined;
			}

			const ticket = await deps.runtimeStore.getRelayTicket(ticketId);
			if (!ticket || Date.parse(ticket.expiresAt) <= Date.now()) {
				return undefined;
			}

			if (!isSameHash(ticket.tokenHash, hashRelayTicketToken(token))) {
				return undefined;
			}

			return { ticket: toPublicRelayTicket(ticket) };
		},

		async issueCallerRelayTicket(input: {
			deviceId: string;
			relayUrl: string;
			transferId: string;
			userId: string;
		}): Promise<RelayTicketResponse> {
			if (!deps.runtimeStore) {
				throw new HttpServiceError(
					"TRANSFER_RUNTIME_UNAVAILABLE",
					500,
					"Transfer runtime store is unavailable",
				);
			}

			const runtime = await deps.runtimeStore.getRuntime(input.transferId);
			if (!runtime) {
				throw new HttpServiceError("TRANSFER_NOT_FOUND", 404, "Transfer not found");
			}

			if (!["accepted", "connecting", "transferring", "paused"].includes(runtime.status)) {
				throw new HttpServiceError("TRANSFER_INVALID_STATE", 409, "Transfer is not ready for relay");
			}

			const caller =
				runtime.sender.deviceId === input.deviceId
					? runtime.sender
					: runtime.receiver.deviceId === input.deviceId
						? runtime.receiver
						: undefined;
			if (!caller || caller.userId !== input.userId) {
				throw new HttpServiceError("TRANSFER_FORBIDDEN", 403, "Current device is not part of this transfer");
			}

			const tickets = await issueRelayTickets({
				transferId: input.transferId,
				sender: runtime.sender,
				receiver: runtime.receiver,
				byteLimit: runtime.progress.totalBytes,
			});
			const issuedTicket = caller.role === "sender" ? tickets.sender : tickets.receiver;

			return {
				relayUrl: input.relayUrl,
				token: issuedTicket.token,
				ticket: issuedTicket.ticket,
			};
		},
	};
}

export type RelayTicketService = ReturnType<typeof createRelayTicketService>;

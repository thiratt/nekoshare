import { xfetch } from "@workspace/app-ui/lib/xfetch";

export interface TransferRelayTicket {
  id: string;
  transferId: string;
  role: "sender" | "receiver";
  userId: string;
  deviceId: string;
  issuer: "server";
  transport: "relay";
  byteLimit: number;
  expiresAt: string;
  issuedAt: string;
}

export interface RelayTicketResponse {
  relayUrl: string;
  token: string;
  ticket: TransferRelayTicket;
}

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

async function readRelayTicketError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    message?: string;
    error?: string;
  } | null;
  return (
    payload?.message ||
    payload?.error ||
    `Relay ticket request failed with status ${response.status}`
  );
}

export async function requestRelayTicket(
  transferId: string,
  deviceId: string,
): Promise<RelayTicketResponse> {
  const response = await xfetch(`transfers/${transferId}/relay-ticket`, {
    headers: {
      "x-neko-device-id": deviceId,
    },
    method: "POST",
    operation: "Relay ticket request",
  });

  if (!response.ok) {
    throw new Error(await readRelayTicketError(response));
  }

  const payload = (await response.json()) as ApiEnvelope<RelayTicketResponse>;
  if (!payload.success || !payload.data) {
    throw new Error(payload.message || "Relay ticket response is invalid");
  }

  return payload.data;
}

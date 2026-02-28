import { auth } from "@/modules/auth/lib";
import type { IConnection } from "@/infrastructure/socket/runtime/types";

import { authSocketRepository } from "./auth.repository";
import type { LoginResult, TokenRevokeResult } from "./auth.types";

export async function authenticateClient(client: IConnection, oneTimeToken: string): Promise<LoginResult> {
	if (client.isAuthenticated) {
		return {
			ok: true,
			user: {
				id: client.user?.id ?? "",
				name: client.user?.name,
			},
		};
	}

	if (!oneTimeToken) {
		return {
			ok: false,
			message: "No session token provided",
			shouldShutdown: true,
		};
	}

	const data = await auth.api.verifyOneTimeToken({
		body: { token: oneTimeToken },
	});

	if (!data.session || !data.user) {
		return {
			ok: false,
			message: "Invalid or expired session",
			shouldShutdown: true,
		};
	}

	const linkedDevice = await authSocketRepository.findFirstDeviceByUserId(data.user.id);
	if (!linkedDevice) {
		return {
			ok: false,
			message: "Associated device not found",
			shouldShutdown: true,
		};
	}

	client.setAuthenticated({
		session: data.session,
		user: {
			...data.user,
			deviceId: linkedDevice.id,
		},
	});

	return {
		ok: true,
		user: {
			id: data.user.id,
			name: data.user.name,
		},
	};
}

export async function revokeOneTimeToken(client: IConnection, token: string): Promise<TokenRevokeResult> {
	if (!client.isAuthenticated || !client.user) {
		return {
			ok: false,
			message: "Not authenticated",
		};
	}

	if (!token) {
		return { ok: true };
	}

	await authSocketRepository.revokeOneTimeToken(token);
	return { ok: true };
}

import {
	createSignedUserProfileAvatarReadUrl,
	deleteUserProfileAvatar,
	isUserProfileAvatarContentType,
	isUserProfileAvatarStorageConfigured,
	uploadUserProfileAvatar,
	USER_PROFILE_AVATAR_MAX_BYTES,
} from "./lib/user-profile-avatar-storage";

import { Logger } from "@/infrastructure/logger";
import { auth } from "@/modules/auth/lib";
import type { AppContext } from "@/shared/http/router";
import { error } from "@/types";

function copySetCookieHeaders(source: Headers, target: Headers): void {
	const headersWithGetSetCookie = source as Headers & { getSetCookie?: () => string[] };
	const setCookieValues = headersWithGetSetCookie.getSetCookie?.() ?? [];

	if (setCookieValues.length > 0) {
		for (const value of setCookieValues) {
			target.append("set-cookie", value);
		}
		return;
	}

	const setCookie = source.get("set-cookie");
	if (setCookie) {
		target.append("set-cookie", setCookie);
	}
}

export async function handleAccountAvatarUpload(c: AppContext) {
	if (!isUserProfileAvatarStorageConfigured()) {
		return c.json(error("AVATAR_STORAGE_NOT_CONFIGURED", "Avatar storage is not configured."), 503);
	}

	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) {
		return c.json(error("UNAUTHORIZED", "Please login to continue"), 401);
	}

	const contentType = c.req.header("content-type")?.split(";")[0]?.trim().toLowerCase();
	if (!isUserProfileAvatarContentType(contentType)) {
		return c.json(error("UNSUPPORTED_AVATAR_TYPE", "Avatar image must be WebP, PNG, or JPEG."), 415);
	}

	const contentLength = Number(c.req.header("content-length") ?? "0");
	if (Number.isFinite(contentLength) && contentLength > USER_PROFILE_AVATAR_MAX_BYTES) {
		return c.json(error("AVATAR_TOO_LARGE", "Avatar image must be 5 MB or smaller."), 413);
	}

	try {
		const body = Buffer.from(await c.req.arrayBuffer());
		if (body.byteLength === 0) {
			return c.json(error("AVATAR_EMPTY", "Avatar image is empty."), 400);
		}

		if (body.byteLength > USER_PROFILE_AVATAR_MAX_BYTES) {
			return c.json(error("AVATAR_TOO_LARGE", "Avatar image must be 5 MB or smaller."), 413);
		}

		const upload = await uploadUserProfileAvatar({
			body,
			contentType,
		});
		const updateResponse = await auth.api.updateUser({
			asResponse: true,
			body: { image: upload.imageUrl },
			headers: c.req.raw.headers,
		});

		if (!updateResponse.ok) {
			await deleteUserProfileAvatar(upload.objectKey).catch((deleteError) => {
				Logger.warn("Auth", "Failed to clean up uploaded avatar after user update failure", deleteError);
			});

			const failurePayload = await updateResponse.json().catch(() => null);
			const errorPayload =
				failurePayload && typeof failurePayload === "object" && !Array.isArray(failurePayload)
					? (failurePayload as { code?: string; error?: string; message?: string })
					: {};

			return c.json(
				error(
					errorPayload.code ?? errorPayload.error ?? "AVATAR_PROFILE_UPDATE_FAILED",
					errorPayload.message ?? "Unable to save avatar right now.",
				),
				updateResponse.status as 400 | 401 | 403 | 500,
			);
		}

		const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
		copySetCookieHeaders(updateResponse.headers, headers);

		return new Response(JSON.stringify(upload), {
			headers,
			status: 200,
		});
	} catch (err) {
		Logger.warn("Auth", "Failed to upload account avatar", err);
		return c.json(error("AVATAR_UPLOAD_FAILED", "Unable to upload avatar right now."), 500);
	}
}

export async function handleAccountAvatarRead(c: AppContext) {
	if (!isUserProfileAvatarStorageConfigured()) {
		return c.json(error("AVATAR_STORAGE_NOT_CONFIGURED", "Avatar storage is not configured."), 503);
	}

	const objectKey = c.req.query("key");
	if (!objectKey) {
		return c.json(error("AVATAR_KEY_REQUIRED", "Avatar key is required."), 400);
	}

	try {
		return c.redirect(await createSignedUserProfileAvatarReadUrl(objectKey));
	} catch (err) {
		Logger.warn("Auth", "Failed to create signed avatar read URL", err);
		return c.json(error("AVATAR_READ_FAILED", "Unable to load avatar right now."), 500);
	}
}

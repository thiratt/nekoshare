import { z } from "zod";
import type { ContentfulStatusCode } from "hono/utils/http-status";

import { error, success } from "@/types";
import type { AppContext } from "@/shared/http/router";

import { HttpServiceError } from "./http-service-error";

export function jsonSuccess(c: AppContext, data: unknown, status: ContentfulStatusCode = 200) {
	return c.json(success(data), status);
}

export function jsonError(c: AppContext, code: string, message: string, status: ContentfulStatusCode) {
	return c.json(error(code, message), status);
}

export function formatZodError(err: z.ZodError): string {
	return err.errors.map((entry) => `${entry.path.join(".")}: ${entry.message}`).join(", ");
}

export function handleControllerError(c: AppContext, err: unknown, options?: { withValidation?: boolean }) {
	if (options?.withValidation && err instanceof z.ZodError) {
		return jsonError(c, "VALIDATION_ERROR", formatZodError(err), 400);
	}

	if (err instanceof HttpServiceError) {
		return jsonError(c, err.code, err.message, err.status);
	}

	throw err;
}

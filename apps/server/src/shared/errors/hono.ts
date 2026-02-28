import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { Logger } from "@/infrastructure/logger";
import { error } from "@/types";

function onError(err: Error | HTTPException, c: Context) {
	if (err instanceof HTTPException) {
		if (err.status >= 500) {
			Logger.error("HTTP", `Unhandled HTTP exception with status ${err.status}`, err);
		} else {
			Logger.warn("HTTP", `HTTP exception with status ${err.status}: ${err.message}`);
		}
		const safeMessage = err.status >= 500 ? "Something went wrong" : err.message;
		return c.json(error("HTTP_ERROR", safeMessage), err.status);
	}
	if (err instanceof z.ZodError) {
		return c.json(error("VALIDATION_ERROR", err.errors.map((entry) => entry.message).join(", ")), 400);
	}
	Logger.error("HTTP", "Unhandled application error", err);
	return c.json(error("INTERNAL_ERROR", "Something went wrong"), 500);
}

export { onError };

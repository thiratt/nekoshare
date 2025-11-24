import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

function onError(err: Error | HTTPException, c: Context) {
	console.log("=== Caught Error ===");
	if (err instanceof HTTPException) {
		return c.text(err.message, err.status);
	}
	if (err instanceof z.ZodError) {
		return c.text(err.errors.map((err) => err.message).join(",\n"), 400);
	}
	console.error(err);
	return c.text("Something went wrong", 500);
}

export { onError };

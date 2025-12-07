import { Hono, type Env } from "hono";

import type { AuthenticatedType } from "@/core/auth";
import type { HonoOptions } from "hono/hono-base";

const createRouter = <T extends Env = { Variables: AuthenticatedType }>(options?: HonoOptions<T>) =>
	new Hono<T>(options);

export { createRouter };

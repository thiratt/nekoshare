import { Hono, type Context, type Env } from "hono";
import type { HonoOptions } from "hono/hono-base";

import type { AuthenticatedType } from "@/modules/auth/lib";

type AppEnv = { Variables: AuthenticatedType };
type AppContext = Context<AppEnv>;

const createRouter = <T extends Env = AppEnv>(options?: HonoOptions<T>) => new Hono<T>(options);

export { createRouter };
export type { AppContext, AppEnv };

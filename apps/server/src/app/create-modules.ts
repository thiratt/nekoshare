import { createAccountModule } from "@/modules/account";
import { createAuthModule } from "@/modules/auth";
import { createDevicesModule } from "@/modules/devices";
import { createFriendsModule } from "@/modules/friends";
import { createRootModule } from "@/modules/root";

import type { AppModuleDependencies } from "./create-module-deps";

export type AppModules = {
	root: ReturnType<typeof createRootModule>;
	auth: ReturnType<typeof createAuthModule>;
	account: ReturnType<typeof createAccountModule>;
	devices: ReturnType<typeof createDevicesModule>;
	friends: ReturnType<typeof createFriendsModule>;
};

export function createModules(deps: AppModuleDependencies): AppModules {
	return {
		root: createRootModule(),
		auth: createAuthModule(),
		account: createAccountModule(),
		devices: createDevicesModule({ events: deps.devicesEvents }),
		friends: createFriendsModule({ events: deps.friendsEvents }),
	};
}

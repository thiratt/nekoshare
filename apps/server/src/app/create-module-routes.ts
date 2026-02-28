import type { AppModules } from "./create-modules";

export type AppModuleRouters = {
	root: AppModules["root"]["router"];
	auth: AppModules["auth"]["router"];
	account: AppModules["account"]["router"];
	devices: AppModules["devices"]["router"];
	friends: AppModules["friends"]["router"];
};

export function createModuleRouters(modules: AppModules): AppModuleRouters {
	return {
		root: modules.root.router,
		auth: modules.auth.router,
		account: modules.account.router,
		devices: modules.devices.router,
		friends: modules.friends.router,
	};
}

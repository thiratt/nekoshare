import { createAccountRouter } from "./account.route";
import { AccountService } from "./account.service";

export type AccountModule = {
	service: AccountService;
	router: ReturnType<typeof createAccountRouter>;
};

export function createAccountModule(): AccountModule {
	const service = new AccountService();

	return {
		service,
		router: createAccountRouter(service),
	};
}

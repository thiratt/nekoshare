import { friendsRepository } from "./friends.repository";
import { createFriendsRouter } from "./friends.route";
import { FriendsService } from "./friends.service";
import type { FriendsEventsPort } from "./friends.service";

export type CreateFriendsModuleInput = {
	events: FriendsEventsPort;
};

export type FriendsModule = {
	service: FriendsService;
	router: ReturnType<typeof createFriendsRouter>;
};

export function createFriendsModule(input: CreateFriendsModuleInput): FriendsModule {
	const service = new FriendsService(friendsRepository, input.events);

	return {
		service,
		router: createFriendsRouter(service),
	};
}

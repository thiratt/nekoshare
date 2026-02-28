import type { AppContext } from "@/shared/http/router";
import { handleControllerError, jsonSuccess } from "@/shared/http";

import { friendRequestSchema } from "./friends.schema";
import { FriendsService } from "./friends.service";

export function createFriendsController(service: FriendsService) {
	return {
		list: async (c: AppContext) => {
			const currentUser = c.get("user");
			const data = await service.list(currentUser.id);

			return jsonSuccess(c, data);
		},

		request: async (c: AppContext) => {
			try {
				const currentUser = c.get("user");
				const rawBody = await c.req.json();
				const body = friendRequestSchema.parse(rawBody);
				const data = await service.request(currentUser, body);

				return jsonSuccess(c, data, 201);
			} catch (err) {
				return handleControllerError(c, err, { withValidation: true });
			}
		},

		accept: async (c: AppContext) => {
			try {
				const currentUser = c.get("user");
				const friendId = c.req.param("id");
				const data = await service.accept(currentUser, friendId);

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},

		reject: async (c: AppContext) => {
			try {
				const currentUser = c.get("user");
				const friendId = c.req.param("id");
				const data = await service.reject(currentUser, friendId);

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},

		cancel: async (c: AppContext) => {
			try {
				const currentUser = c.get("user");
				const friendId = c.req.param("id");
				const data = await service.cancel(currentUser, friendId);

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},

		remove: async (c: AppContext) => {
			try {
				const currentUser = c.get("user");
				const friendId = c.req.param("id");
				const data = await service.remove(currentUser, friendId);

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},

		search: async (c: AppContext) => {
			const currentUser = c.get("user");
			const q = c.req.query("q") ?? "";
			const data = await service.search(currentUser, q);

			return jsonSuccess(c, data);
		},
	};
}

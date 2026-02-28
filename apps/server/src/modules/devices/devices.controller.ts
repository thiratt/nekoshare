import type { AppContext } from "@/shared/http/router";
import { handleControllerError, jsonSuccess } from "@/shared/http";

import { deviceRegistrationSchema, deviceUpdateSchema } from "./devices.schema";
import { DevicesService } from "./devices.service";

export function createDevicesController(service: DevicesService) {
	return {
		list: async (c: AppContext) => {
			const session = c.get("session");
			const data = await service.list(session);

			return jsonSuccess(c, data);
		},

		register: async (c: AppContext) => {
			try {
				const session = c.get("session");
				const rawBody = await c.req.json();
				const body = deviceRegistrationSchema.parse(rawBody);
				const data = await service.register(session, body);

				return jsonSuccess(c, data, data.isNew ? 201 : 200);
			} catch (err) {
				return handleControllerError(c, err, { withValidation: true });
			}
		},

		update: async (c: AppContext) => {
			try {
				const session = c.get("session");
				const deviceId = c.req.param("id");
				const rawBody = await c.req.json();
				const body = deviceUpdateSchema.parse(rawBody);
				const data = await service.update(session, deviceId, body);

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err, { withValidation: true });
			}
		},

		remove: async (c: AppContext) => {
			try {
				const session = c.get("session");
				const deviceId = c.req.param("id");
				const data = await service.remove(session, deviceId);

				return jsonSuccess(c, data);
			} catch (err) {
				return handleControllerError(c, err);
			}
		},
	};
}

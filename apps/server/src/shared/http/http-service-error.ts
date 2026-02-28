import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HttpServiceError extends Error {
	constructor(
		public readonly code: string,
		public readonly status: ContentfulStatusCode,
		message: string,
	) {
		super(message);
		this.name = new.target.name;
	}
}

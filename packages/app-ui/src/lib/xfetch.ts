import { config } from "./config";

// TODO: Replace with actual base API URL from config
// - replace credentials with same-origin
function xfetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
	let url: string;

	if (typeof input === "string") {
		const trimmed = input.trim();

		if (/^https?:\/\//i.test(trimmed)) {
			url = trimmed;
		} else {
			url = config.apiBaseUrl.replace(/\/+$/, "") + "/" + trimmed.replace(/^\/+/, "");
		}
	} else if (input instanceof Request) {
		url = input.url;
	} else {
		throw new Error("Invalid input for xfetch");
	}

	return fetch(url, {
		...init,
		credentials: "include",
	});
}

export { xfetch };

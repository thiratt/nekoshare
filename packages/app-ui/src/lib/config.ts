type Config = {
	apiBaseUrl: string;
	webSocketBaseUrl: string;
};

// Plan: Replace with global environment variables when building for different environments.
export const config: Config = {
	apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "http://localhost:7780",
	webSocketBaseUrl: import.meta.env.VITE_WS_BASE_URL || "ws://localhost:7780/ws",
};

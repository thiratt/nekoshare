import { defineConfig } from "tsdown";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		minify: true,
		define: {
			"process.env.NODE_ENV": '"production"',
		},
		deps: {
			alwaysBundle: [/^@workspace/],
		},
	},
]);

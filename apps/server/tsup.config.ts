import { defineConfig } from "tsup";

export default defineConfig((options) => ({
	...options,
	entry: ["src/index.ts"],
	format: ["esm"],
    clean: true,
    minify: true,
}));

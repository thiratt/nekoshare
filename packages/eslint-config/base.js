import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

import simpleImportSort from "eslint-plugin-simple-import-sort";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
	js.configs.recommended,
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	{
		plugins: {
			turbo: turboPlugin,
			"simple-import-sort": simpleImportSort,
		},
		rules: {
			"turbo/no-undeclared-env-vars": "warn",
			"simple-import-sort/imports": [
				"error",
				{
					groups: [
						// Node.js built-ins
						["^node:"],

						// External packages
						["^@?\\w"],

						// Internal packages (workspace aliases)
						["^@workspace/"],

						// Relative imports
						["^\\./", "^\\.\\./"],

						// Side-effect imports
						["^\\u0000"],
					],
				},
			],
			"simple-import-sort/exports": "error",
		},
	},
	{
		plugins: {
			onlyWarn,
		},
	},
	{
		ignores: ["dist/**"],
	},
];

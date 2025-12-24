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
						["^react$", "^react/.*", "^react.*\\u0000$"],
						["^(?!@workspace)@?\\w", "^(?!@workspace)@?\\w.*\\u0000$"],
						["^@workspace/ui", "^@workspace/ui.*\\u0000$"],
						["^@workspace/app-ui", "^@workspace/app-ui.*\\u0000$"],
						["^\\.", "^\\..*\\u0000$"],
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

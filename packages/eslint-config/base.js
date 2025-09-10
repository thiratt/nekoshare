import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import onlyWarn from "eslint-plugin-only-warn";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config}
 * */
export const config = [
	js.configs.recommended,
	eslintConfigPrettier,
	...tseslint.configs.recommended,
	{
		plugins: {
			turbo: turboPlugin,
		},
		rules: {
			"turbo/no-undeclared-env-vars": "warn",
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
	{
		plugins: {
			import: importPlugin,
		},
		rules: {
			"no-console": "error",
			"import/order": [
				"warn",
				{
					groups: ["type", "builtin", "object", "external", "internal", "parent", "sibling", "index"],

					pathGroups: [
						{
							pattern: "@/**",
							group: "external",
							position: "after",
						},
					],

					"newlines-between": "always",
				},
			],
		},
	},
];

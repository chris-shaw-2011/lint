import { defineConfig } from "eslint/config"
import eslintReact from "@eslint-react/eslint-plugin"
import baseConfig from "./index.ts"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"

const reactFiles = ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"]

export default defineConfig(
	...baseConfig,
	{
		files: reactFiles,
		extends: [
			reactHooks.configs.flat["recommended-latest"],
			reactRefresh.configs.recommended,
		],
	},
	{
		files: ["src/**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
		extends: [eslintReact.configs["strict-type-checked"]],
		rules: {
			"@eslint-react/dom-no-string-style-prop": "error",
			"@eslint-react/dom-no-unknown-property": "error",
			"@eslint-react/no-duplicate-key": "error",
			"@eslint-react/no-implicit-children": "error",
			"@eslint-react/no-implicit-key": "error",
			"@eslint-react/no-implicit-ref": "error",
			"@eslint-react/no-missing-component-display-name": "error",
			"@eslint-react/no-missing-context-display-name": "error",
			"@eslint-react/no-unused-state": "error",
			"@eslint-react/error-boundaries": "off",
			"@eslint-react/exhaustive-deps": "off",
			"@eslint-react/purity": "off",
			"@eslint-react/rules-of-hooks": "off",
			"@eslint-react/set-state-in-effect": "off",
			"@eslint-react/set-state-in-render": "off",
			"@eslint-react/static-components": "off",
			"@eslint-react/unsupported-syntax": "off",
			"@eslint-react/use-memo": "off",
		},
		languageOptions: {
			globals: {
				...globals.serviceworker,
				...globals.browser,
			},
		},
	},
)

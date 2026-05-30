import { defineConfig } from "eslint/config"
import baseConfig from "./index.js"
import globals from "globals"
import reactPlugin from "eslint-plugin-react"
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
		...reactPlugin.configs.flat.recommended,
		...reactPlugin.configs.flat["jsx-runtime"],
		settings: {
			react: {
				version: "detect",
			},
		},
		languageOptions: {
			...reactPlugin.configs.flat.recommended.languageOptions,
			globals: {
				...globals.serviceworker,
				...globals.browser,
			},
		},
	},
)

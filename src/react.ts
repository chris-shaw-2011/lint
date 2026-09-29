import { defineConfig } from "eslint/config"
import baseConfig from "./index.ts"
import globals from "globals"
import reactPlugin from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"

const reactFiles = ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"]
const reactRecommended = reactPlugin.configs.flat.recommended
const reactJsxRuntime = reactPlugin.configs.flat["jsx-runtime"]

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
		plugins: {
			...reactRecommended.plugins,
			...reactJsxRuntime.plugins,
		},
		rules: {
			...reactRecommended.rules,
			...reactJsxRuntime.rules,
		},
		settings: {
			react: {
				version: "detect",
			},
		},
		languageOptions: {
			...reactRecommended.languageOptions,
			...reactJsxRuntime.languageOptions,
			globals: {
				...globals.serviceworker,
				...globals.browser,
			},
		},
	},
)

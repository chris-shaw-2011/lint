import { createKnipConfig } from "./src/knip.ts"

export default createKnipConfig({
	typescript: {
		config: "tsconfig.build.json",
	},
	entry: [
		"src/react.ts",
		"src/knip.ts",
		"src/bin/eslint.ts",
		"src/bin/knip.ts",
		"src/bin/sherif.ts",
	],
	project: [
		"src/**/*.ts",
		"scripts/**/*.ts",
	],
	ignoreDependencies: [
		"jsonc-eslint-parser",
	],
})

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
		"src/bin/stylelint.ts",
		"src/stylelint.ts",
	],
	project: [
		"src/**/*.ts",
		"scripts/**/*.ts",
	],
	ignoreDependencies: [
		"@stylistic/stylelint-config",
		"jsonc-eslint-parser",
		"sherif",
		"stylelint-config-standard-scss",
		"stylelint-scss",
		"ts-api-utils",
	],
})

import type { Config } from "stylelint"

const config: Config = {
	extends: [
		"stylelint-config-standard-scss",
		"@stylistic/stylelint-config",
	],
	rules: {
		"@stylistic/indentation": "tab",
		"@stylistic/string-quotes": "double",
		"selector-class-pattern": [
			"^[a-z][a-zA-Z0-9]*$",
			{
				message: "Expected class selector to be camelCase",
			},
		],
		"selector-pseudo-class-no-unknown": [
			true,
			{
				ignorePseudoClasses: ["global"],
			},
		],
	},
}

export default config

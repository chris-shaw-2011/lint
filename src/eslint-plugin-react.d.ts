declare module "eslint-plugin-react" {
	import type { ESLint, Linter } from "eslint"

	const reactPlugin: ESLint.Plugin & {
		configs: {
			flat: {
				"recommended": Linter.Config,
				"jsx-runtime": Linter.Config,
			},
		},
	}

	export default reactPlugin
}

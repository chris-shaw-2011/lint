import { defineConfig } from "eslint/config"
import typeInference from "eslint-plugin-type-inference"
import type { Linter } from "eslint"
import config from "./without-type-inference.ts"
import { tsFiles, typeUncheckedConfigFiles } from "./file-patterns.ts"

type FlatPlugin = NonNullable<Linter.Config["plugins"]>[string]

export default defineConfig(
	...config,
	{
		files: tsFiles,
		ignores: typeUncheckedConfigFiles,
		plugins: {
			"type-inference": typeInference as unknown as FlatPlugin,
		},
		rules: {
			"type-inference/no-inferrable-return-type": "error",
		},
	},
)

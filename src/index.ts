import { defineConfig } from "eslint/config"
import typeInference from "eslint-plugin-type-inference"
import type { CompatiblePlugin } from "typescript-eslint"
import config from "./without-type-inference.ts"
import { tsFiles, typeUncheckedConfigFiles } from "./file-patterns.ts"

const typeInferencePlugin: CompatiblePlugin = typeInference

export default defineConfig(
	...config,
	{
		files: tsFiles,
		ignores: typeUncheckedConfigFiles,
		plugins: {
			"type-inference": typeInferencePlugin,
		},
		rules: {
			"type-inference/no-inferrable-return-type": "error",
		},
	},
)

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import eslintReact from "@eslint-react/eslint-plugin"
import type { Linter } from "eslint"

interface PackageJson {
	dependencies?: Record<string, string>,
	exports?: Record<string, unknown>,
}

const typeInferencePluginName = "type-inference"
const typeInferenceRuleName = "type-inference/no-inferrable-return-type"

function assertNoTypeInferenceReferences(value: unknown, seen = new WeakSet<object>()): void {
	if (typeof value === "string") {
		assert.notEqual(value, "eslint-plugin-type-inference")
		assert.notEqual(value, typeInferencePluginName)
		assert.equal(value.startsWith(`${typeInferencePluginName}/`), false)
		return
	}

	if (typeof value !== "object" || value === null || seen.has(value)) {
		return
	}

	seen.add(value)

	for (const [key, child] of Object.entries(value)) {
		assert.notEqual(key, typeInferencePluginName)
		assert.equal(key.startsWith(`${typeInferencePluginName}/`), false)
		assertNoTypeInferenceReferences(child, seen)
	}
}

void test("normal config adds the type-inference integration to the shared config", async () => {
	const withoutTypeInference = (await import("../src/without-type-inference.ts")).default
	const sharedEntriesBeforeNormalImport = [...withoutTypeInference]
	const normal = (await import("../src/index.ts")).default

	assert.equal(normal.length, withoutTypeInference.length + 1)
	assert.deepEqual(withoutTypeInference, sharedEntriesBeforeNormalImport)

	for (const [index, config] of withoutTypeInference.entries()) {
		assert.strictEqual(normal[index], config, `shared config entry ${index} should remain unchanged`)
	}

	const integration = normal.at(-1) as Linter.Config
	assert.deepEqual(integration.files, ["**/*.{ts,tsx,mts,cts}"])
	assert.deepEqual(integration.ignores, [
		"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
		"**/*.config.{js,mjs,cjs,ts,mts,cts}",
		"**/playwright*.{js,mjs,cjs,ts,mts,cts}",
	])
	assert.ok(integration.plugins?.[typeInferencePluginName])
	assert.equal(integration.rules?.[typeInferenceRuleName], "error")
})

void test("without-type-inference contains no type-inference integration", async () => {
	const config = (await import("../src/without-type-inference.ts")).default

	assertNoTypeInferenceReferences(config)

	const source = readFileSync(new URL("../src/without-type-inference.ts", import.meta.url), "utf8")
	assert.equal(source.includes("eslint-plugin-type-inference"), false)
	assert.equal(source.includes("type-inference/"), false)
})

void test("package declares the without-type-inference export", () => {
	const packageJson = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	) as PackageJson

	assert.deepEqual(packageJson.exports?.["./without-type-inference"], {
		types: "./dist/without-type-inference.d.ts",
		default: "./dist/without-type-inference.js",
	})
})

void test("React config enables strict type-checked rules and curated additions", async () => {
	const reactConfig = (await import("../src/react.ts")).default
	const hooksPreset = reactConfig.find(config => config.plugins?.["react-hooks"])
	const refreshPreset = reactConfig.find(config => config.plugins?.["react-refresh"])
	const preset = reactConfig.at(-2) as Linter.Config
	const integration = reactConfig.at(-1) as Linter.Config

	assert.equal(hooksPreset?.rules?.["react-hooks/rules-of-hooks"], "error")
	assert.deepEqual(refreshPreset?.rules?.["react-refresh/only-export-components"], ["error", {}])
	assert.match(preset.name ?? "", /@eslint-react\/strict-type-checked$/v)
	assert.deepEqual(preset.files, ["src/**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"])
	assert.deepEqual(preset.rules, eslintReact.configs["strict-type-checked"].rules)
	assert.strictEqual(preset.plugins?.["@eslint-react"], eslintReact)
	assert.deepEqual(integration.files, ["src/**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"])
	const configuredGlobals = integration.languageOptions?.globals as Record<string, boolean> | undefined
	assert.ok(configuredGlobals)
	assert.equal(configuredGlobals.window, false)
	assert.equal(configuredGlobals.self, false)

	for (const ruleName of [
		"@eslint-react/dom-no-string-style-prop",
		"@eslint-react/dom-no-unknown-property",
		"@eslint-react/no-duplicate-key",
		"@eslint-react/no-implicit-children",
		"@eslint-react/no-implicit-key",
		"@eslint-react/no-implicit-ref",
		"@eslint-react/no-missing-component-display-name",
		"@eslint-react/no-missing-context-display-name",
		"@eslint-react/no-unused-state",
	]) {
		assert.equal(integration.rules?.[ruleName], "error", `${ruleName} should be enabled`)
	}

	for (const ruleName of [
		"@eslint-react/error-boundaries",
		"@eslint-react/exhaustive-deps",
		"@eslint-react/purity",
		"@eslint-react/rules-of-hooks",
		"@eslint-react/set-state-in-effect",
		"@eslint-react/set-state-in-render",
		"@eslint-react/static-components",
		"@eslint-react/unsupported-syntax",
		"@eslint-react/use-memo",
	]) {
		assert.equal(integration.rules?.[ruleName], "off", `${ruleName} should defer to react-hooks`)
	}
})

void test("package uses ESLint React instead of the patched legacy plugin", () => {
	const packageJson = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	) as PackageJson

	assert.match(packageJson.dependencies?.["@eslint-react/eslint-plugin"] ?? "", /^\^/v)
	assert.equal(packageJson.dependencies?.["eslint-plugin-react"], undefined)
})

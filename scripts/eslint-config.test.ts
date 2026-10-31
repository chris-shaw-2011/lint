import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import test from "node:test"
import eslintReact from "@eslint-react/eslint-plugin"
import { ESLint } from "eslint"
import packageJson from "../package.json" with { type: "json" }

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

	const integration = normal.at(-1)

	assert.ok(integration)
	assert.deepEqual(integration.files, ["**/*.{ts,tsx,mts,cts}"])
	assert.deepEqual(integration.ignores, [
		"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
		"**/*.config.{js,mjs,cjs,ts,mts,cts}",
		"**/playwright*.{js,mjs,cjs,ts,mts,cts}",
	])
	assert.strictEqual(
		integration.plugins?.[typeInferencePluginName],
		(await import("eslint-plugin-type-inference")).default,
	)
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
	assert.deepEqual(packageJson.exports["./without-type-inference"], {
		types: "./dist/without-type-inference.d.ts",
		default: "./dist/without-type-inference.js",
	})
})

void test("React config enables strict type-checked rules and curated additions", async () => {
	const reactConfig = (await import("../src/react.ts")).default
	const hooksPreset = reactConfig.find(config => config.plugins?.["react-hooks"])
	const refreshPreset = reactConfig.find(config => config.plugins?.["react-refresh"])
	const preset = reactConfig.at(-2)
	const integration = reactConfig.at(-1)

	assert.ok(preset)
	assert.ok(integration)

	assert.equal(hooksPreset?.rules?.["react-hooks/rules-of-hooks"], "error")
	assert.deepEqual(refreshPreset?.rules?.["react-refresh/only-export-components"], ["error", {}])
	assert.match(preset.name ?? "", /@eslint-react\/strict-type-checked$/v)
	assert.deepEqual(preset.files, ["src/**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"])
	assert.deepEqual(preset.rules, eslintReact.configs["strict-type-checked"].rules)
	assert.strictEqual(preset.plugins?.["@eslint-react"], eslintReact)
	assert.deepEqual(integration.files, ["src/**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"])
	const configuredGlobals = integration.languageOptions?.globals

	assert.ok(typeof configuredGlobals === "object" && configuredGlobals !== null)
	assert.ok("window" in configuredGlobals && "self" in configuredGlobals)
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
	assert.match(packageJson.dependencies["@eslint-react/eslint-plugin"], /^\^/v)
	assert.equal("eslint-plugin-react" in packageJson.dependencies, false)
})

void test("all shared configs reject unsafe narrowing assertions and accept validated JSON", async () => {
	const configs = [
		(await import("../src/index.ts")).default,
		(await import("../src/without-type-inference.ts")).default,
		(await import("../src/react.ts")).default,
	]
	const filePath = fileURLToPath(import.meta.url)

	for (const overrideConfig of configs) {
		const eslint = new ESLint({ overrideConfigFile: true, overrideConfig })
		const [unsafe] = await eslint.lintText(`export function readTitle(value: unknown) {
	const book = value as { Title: string }

	return book.Title
}
`, { filePath })

		assert.ok(unsafe)
		assert.deepEqual(unsafe.messages.map(message => message.ruleId), [
			"@typescript-eslint/no-unsafe-type-assertion",
		])

		const [safe] = await eslint.lintText(`export function parseTitle(text: string) {
	const value: unknown = JSON.parse(text)

	if (typeof value !== "object" || value === null || !("Title" in value) || typeof value.Title !== "string") {
		throw new Error("Expected a book with a title")
	}

	return value.Title
}
`, { filePath })

		assert.ok(safe)
		assert.deepEqual(safe.messages, [])
	}
})

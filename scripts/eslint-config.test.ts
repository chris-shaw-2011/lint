import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import type { Linter } from "eslint"

interface PackageJson {
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

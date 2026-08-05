import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

interface PackageJson {
	exports?: Record<string, unknown>,
}

function assertNoTypeInferenceReferences(value: unknown, seen = new WeakSet<object>()): void {
	if (typeof value === "string") {
		assert.notEqual(value, "eslint-plugin-type-inference")
		assert.notEqual(value, "type-inference")
		assert.equal(value.startsWith("type-inference/"), false)
		return
	}

	if (typeof value !== "object" || value === null || seen.has(value)) {
		return
	}

	seen.add(value)

	for (const [key, child] of Object.entries(value)) {
		assert.notEqual(key, "type-inference")
		assert.equal(key.startsWith("type-inference/"), false)
		assertNoTypeInferenceReferences(child, seen)
	}
}

void test("normal and without-type-inference entry points share the same config", async () => {
	const withoutTypeInference = (await import("../src/without-type-inference.ts")).default
	const normal = (await import("../src/index.ts")).default

	assert.strictEqual(normal, withoutTypeInference)
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

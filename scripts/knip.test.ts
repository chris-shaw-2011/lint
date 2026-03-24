import assert from "node:assert/strict"
import test from "node:test"
import baseConfig, { createKnipConfig, rootWorkspaceConfig, workspaceConfig } from "../src/knip.ts"

void test("base knip config includes shared config entry patterns", () => {
	assert.deepEqual(baseConfig.entry, [
		"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
		"**/knip.config.{js,mjs,cjs,ts,mts,cts}",
	])
})

void test("workspace config prepends shared entries and defaults to code files", () => {
	assert.deepEqual(workspaceConfig(), {
		entry: [
			"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
			"**/knip.config.{js,mjs,cjs,ts,mts,cts}",
		],
		project: ["**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"],
	})
})

void test("root workspace config stays scoped to root-friendly defaults", () => {
	assert.deepEqual(rootWorkspaceConfig(), {
		entry: [
			"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
			"**/knip.config.{js,mjs,cjs,ts,mts,cts}",
		],
		project: [
			"*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
			"src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
			"scripts/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
		],
	})
})

void test("createKnipConfig merges shared entry patterns once", () => {
	assert.deepEqual(
		createKnipConfig({
			entry: ["src/index.ts"],
			workspaces: {
				".": rootWorkspaceConfig(),
			},
		}),
		{
			entry: [
				"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
				"**/knip.config.{js,mjs,cjs,ts,mts,cts}",
				"src/index.ts",
			],
			workspaces: {
				".": {
					entry: [
						"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
						"**/knip.config.{js,mjs,cjs,ts,mts,cts}",
					],
					project: [
						"*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
						"src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
						"scripts/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}",
					],
				},
			},
		},
	)
})

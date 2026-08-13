import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import stylelint from "stylelint"
import config from "../src/stylelint.ts"

interface PackageJson {
	exports?: Record<string, unknown>,
}

async function lintScss(code: string) {
	const result = await stylelint.lint({
		code,
		codeFilename: "fixture.scss",
		config,
	})

	return result.results.flatMap(lintResult => lintResult.warnings)
}

void test("SCSS config includes recommended and shared stylistic rules", async () => {
	assert.deepEqual(config.extends, [
		"stylelint-config-standard-scss",
		"@stylistic/stylelint-config",
	])
	assert.ok(config.rules)
	assert.equal(config.rules["@stylistic/indentation"], "tab")
	assert.equal(config.rules["@stylistic/string-quotes"], "double")

	const warnings = await lintScss(`@mixin example($value) {
	@if $value == null {
		content: 'invalid';
	}
}
`)
	const ruleNames = new Set(warnings.map(warning => warning.rule))

	assert.ok(ruleNames.has("scss/at-if-no-null"))
	assert.ok(ruleNames.has("@stylistic/string-quotes"))
})

void test("SCSS config enforces camelCase class selectors", async () => {
	for (const className of ["button", "mainContent", "logIn", "item2"]) {
		const warnings = await lintScss(`.${className} {\n\tcolor: red;\n}\n`)
		assert.equal(warnings.length, 0, `.${className} should pass`)
	}

	for (const className of ["main-content", "main_content", "MainContent"]) {
		const warnings = await lintScss(`.${className} {\n\tcolor: red;\n}\n`)
		assert.ok(
			warnings.some(warning => warning.rule === "selector-class-pattern"),
			`.${className} should fail selector-class-pattern`,
		)
	}
})

void test("SCSS config allows only the CSS Modules global pseudo-class exemption", async () => {
	for (const selector of [".button:global", ".button:global(.external)"]) {
		const warnings = await lintScss(`${selector} {\n\tcolor: red;\n}\n`)
		assert.equal(warnings.length, 0, `${selector} should pass`)
	}

	const warnings = await lintScss(`.button:unknown {\n\tcolor: red;\n}\n`)
	assert.ok(warnings.some(warning => warning.rule === "selector-pseudo-class-no-unknown"))
})

void test("package declares the stylelint config export and CLI", () => {
	const packageJson = JSON.parse(
		readFileSync(new URL("../package.json", import.meta.url), "utf8"),
	) as PackageJson & { bin?: Record<string, string> }

	assert.deepEqual(packageJson.exports?.["./stylelint"], {
		types: "./dist/stylelint.d.ts",
		default: "./dist/stylelint.js",
	})
	assert.equal(packageJson.bin?.stylelint, "./dist/bin/stylelint.js")
})

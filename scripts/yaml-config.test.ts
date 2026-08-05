import assert from "node:assert/strict"
import test from "node:test"
import { ESLint, type Linter } from "eslint"

interface ResolvedConfig {
	language?: unknown,
	rules: Record<string, unknown>,
}

const overrideConfig = (await import("../src/index.ts")).default as Linter.Config[]

const eslint = new ESLint({
	overrideConfigFile: true,
	overrideConfig,
})

function isRuleEnabled(rule: unknown): boolean {
	if (rule === null || rule === undefined) {
		return false
	}

	if (Array.isArray(rule)) {
		return isRuleEnabled(rule[0])
	}

	if (rule === 0 || rule === "off") {
		return false
	}

	return true
}

function assertRuleDisabled(
	rules: Record<string, unknown>,
	ruleName: string,
	filePath: string,
) {
	assert.equal(
		isRuleEnabled(rules[ruleName]),
		false,
		`${ruleName} should be disabled for ${filePath}`,
	)
}

async function getConfigForFile(filePath: string): Promise<ResolvedConfig> {
	const config: unknown = await eslint.calculateConfigForFile(filePath)

	if (!config || typeof config !== "object") {
		throw new Error(`Expected a resolved config object for ${filePath}.`)
	}

	const { language, rules } = config as {
		language?: unknown,
		rules?: unknown,
	}

	if (!rules || typeof rules !== "object") {
		throw new Error(`Expected resolved rules for ${filePath}.`)
	}

	return {
		language,
		rules: rules as Record<string, unknown>,
	}
}

void test("yaml files only keep YAML rule families", async () => {
	const config = await getConfigForFile("docker-compose.yml")

	assert.ok(config.language)
	assert.ok(isRuleEnabled(config.rules["yml/no-empty-document"]))
	assert.ok(isRuleEnabled(config.rules["yml/indent"]))
	assertRuleDisabled(config.rules, "@stylistic/arrow-parens", "docker-compose.yml")
	assertRuleDisabled(config.rules, "@stylistic/spaced-comment", "docker-compose.yml")
	assertRuleDisabled(config.rules, "@typescript-eslint/await-thenable", "docker-compose.yml")
})

void test("json files only keep JSON rule families", async () => {
	const config = await getConfigForFile("package.json")

	assert.ok(config.language)
	assert.ok(isRuleEnabled(config.rules["jsonc/no-dupe-keys"]))
	assertRuleDisabled(config.rules, "@stylistic/arrow-parens", "package.json")
	assertRuleDisabled(config.rules, "@typescript-eslint/await-thenable", "package.json")
	assertRuleDisabled(config.rules, "yml/no-empty-document", "package.json")
})

void test("markdown files only keep Markdown rule families", async () => {
	const config = await getConfigForFile("README.md")

	assert.ok(config.language)
	assert.ok(isRuleEnabled(config.rules["markdown/heading-increment"]))
	assertRuleDisabled(config.rules, "@stylistic/arrow-parens", "README.md")
	assertRuleDisabled(config.rules, "@typescript-eslint/await-thenable", "README.md")
	assertRuleDisabled(config.rules, "jsonc/no-dupe-keys", "README.md")
	assertRuleDisabled(config.rules, "yml/no-empty-document", "README.md")
})

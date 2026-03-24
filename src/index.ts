import { defineConfig } from "eslint/config"
import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import stylistic from "@stylistic/eslint-plugin"
import markdown from "@eslint/markdown"
import jsonc from "eslint-plugin-jsonc"
import yml from "eslint-plugin-yml"
import type { Rule } from "eslint"

interface AstNode {
	type: string,
}

function isAstNode(value: unknown): value is AstNode {
	if (typeof value !== "object" || value === null) {
		return false
	}
	return "type" in value && typeof (value as { type?: unknown }).type === "string"
}

function getAstProperty(value: unknown, key: string): unknown {
	if (typeof value !== "object" || value === null) {
		return undefined
	}
	if (!(key in value)) {
		return undefined
	}
	return (value as Record<string, unknown>)[key]
}

function isTruthyBooleanProperty(value: unknown, key: string): boolean {
	return getAstProperty(value, key) === true
}

function getIdentifierName(node: unknown): string | null {
	if (!isAstNode(node) || node.type !== "Identifier") {
		return null
	}
	const name = getAstProperty(node, "name")
	return typeof name === "string" ? name : null
}

function getStaticPropertyName(node: unknown): string | null {
	if (!isAstNode(node)) {
		return null
	}

	if (node.type === "Identifier") {
		return getIdentifierName(node)
	}

	if (node.type === "Literal") {
		const value = getAstProperty(node, "value")
		if (typeof value === "string") {
			return value
		}
		if (typeof value === "number") {
			return String(value)
		}
	}

	return null
}

function unwrapChainExpression(expression: unknown): unknown {
	if (!isAstNode(expression) || expression.type !== "ChainExpression") {
		return expression
	}
	return getAstProperty(expression, "expression")
}

const noRedundantObjectRemapRule: Rule.RuleModule = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow redundant return-object remaps that can return the source object directly",
		},
		schema: [],
		messages: {
			redundant: "Unnecessary object remap. Return '{{source}}' directly.",
		},
	},
	create(context) {
		function getRemappedSourceName(node: unknown): string | null {
			const value = unwrapChainExpression(node)
			if (!isAstNode(value) || value.type !== "ObjectExpression") {
				return null
			}

			const properties = getAstProperty(value, "properties")
			if (!Array.isArray(properties) || properties.length < 2) {
				return null
			}

			let sourceName: string | null = null

			for (const property of properties) {
				if (!isAstNode(property) || property.type !== "Property") {
					return null
				}
				if (
					getAstProperty(property, "kind") !== "init" ||
					isTruthyBooleanProperty(property, "method") ||
					isTruthyBooleanProperty(property, "computed")
				) {
					return null
				}

				const keyName = getStaticPropertyName(getAstProperty(property, "key"))
				if (!keyName) {
					return null
				}

				const memberValue = unwrapChainExpression(getAstProperty(property, "value"))
				if (!isAstNode(memberValue) || memberValue.type !== "MemberExpression") {
					return null
				}
				if (
					isTruthyBooleanProperty(memberValue, "computed") ||
					isTruthyBooleanProperty(memberValue, "optional")
				) {
					return null
				}

				const valueObject = unwrapChainExpression(getAstProperty(memberValue, "object"))
				const objectName = getIdentifierName(valueObject)
				if (!objectName) {
					return null
				}

				const valuePropertyName = getStaticPropertyName(getAstProperty(memberValue, "property"))
				if (!valuePropertyName || valuePropertyName !== keyName) {
					return null
				}

				if (sourceName === null) {
					sourceName = objectName
					continue
				}

				if (sourceName !== objectName) {
					return null
				}
			}

			return sourceName
		}

		return {
			ObjectExpression(node) {
				const sourceName = getRemappedSourceName(node)
				if (!sourceName) {
					return
				}

				context.report({
					node,
					messageId: "redundant",
					data: {
						source: sourceName,
					},
				})
			},
		}
	},
}

const markdownDisabledCoreRules = Object.fromEntries(
	Object.keys(eslint.configs.recommended.rules).map(ruleName => [ruleName, "off"] as const),
)

function disableRulesWithPrefix(
	configs: { rules?: Record<string, unknown> }[],
	prefix: string,
): Record<string, "off"> {
	const disabledRules = new Set<string>()

	for (const config of configs) {
		if (!config.rules) {
			continue
		}
		for (const ruleName of Object.keys(config.rules)) {
			if (ruleName.startsWith(prefix)) {
				disabledRules.add(ruleName)
			}
		}
	}

	return Object.fromEntries(Array.from(disabledRules, ruleName => [ruleName, "off"] as const))
}

const markdownDisabledJsoncRules = disableRulesWithPrefix(
	jsonc.configs["flat/recommended-with-json"] as { rules?: Record<string, unknown> }[],
	"jsonc/",
)

const markdownDisabledYmlRules = disableRulesWithPrefix(
	yml.configs["flat/recommended"] as { rules?: Record<string, unknown> }[],
	"yml/",
)

export default defineConfig(
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"**/playwright-report/**",
			"**/test-results/**",
			"**/package-lock.json",
			"**/bin/**",
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
	},
	stylistic.configs.customize({
		indent: "tab",
		quotes: "double",
		semi: false,
		jsx: true,
	}),
	{
		files: ["**/*.{json,jsonc,json5}"],
		...tseslint.configs.disableTypeChecked,
	},
	{
		files: ["**/*.{yml,yaml}"],
		...tseslint.configs.disableTypeChecked,
	},
	{
		files: ["**/*.md"],
		...tseslint.configs.disableTypeChecked,
	},
	...jsonc.configs["flat/recommended-with-json"],
	...yml.configs["flat/recommended"],
	{
		files: ["**/*.md"],
		plugins: {
			markdown,
		},
		extends: ["markdown/recommended"],
		rules: {
			...markdownDisabledCoreRules,
			...markdownDisabledJsoncRules,
			...markdownDisabledYmlRules,
		},
	},
	{
		files: ["**/*.{json,jsonc,json5}"],
		rules: {
			"jsonc/indent": ["error", "tab"],
		},
	},
	{
		files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,mts,cts,tsx,mtsx}"],
		plugins: {
			internal: {
				rules: {
					"no-redundant-object-remap": noRedundantObjectRemapRule,
				},
			},
		},
		rules: {
			"internal/no-redundant-object-remap": "error",
		},
	},
	{
		files: ["**/*.{ts,tsx,mts,cts}"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: process.cwd(),
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
		rules: {
			"arrow-body-style": ["error", "as-needed"],
			"@typescript-eslint/explicit-module-boundary-types": "off",
			"@stylistic/arrow-parens": ["error", "as-needed"],
			"semi": ["error", "never"],
			"quotes": [
				"error",
				"double",
				{
					allowTemplateLiterals: true,
				},
			],
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-deprecated": "warn",
			"no-use-before-define": "off",
			"@typescript-eslint/no-use-before-define": ["error"],
			"prefer-template": "error",
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNullish: true,
				},
			],
			"@stylistic/comma-dangle": ["error", "always-multiline"],
			"@stylistic/member-delimiter-style": [
				"error",
				{
					multiline: {
						delimiter: "comma",
						requireLast: true,
					},
					singleline: {
						delimiter: "comma",
						requireLast: false,
					},
				},
			],
			"@stylistic/eol-last": ["error", "always"],
			"@stylistic/operator-linebreak": ["error", "after"],
			"@typescript-eslint/no-confusing-void-expression": [
				"error",
				{
					ignoreArrowShorthand: true,
				},
			],
			"no-console": "error",
		},
	},
	{
		files: [
			"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
			"**/*.config.{js,mjs,cjs,ts,mts,cts}",
			"**/playwright*.{js,mjs,cjs,ts,mts,cts}",
		],
		...tseslint.configs.disableTypeChecked,
	},
)

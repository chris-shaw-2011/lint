import assert from "node:assert/strict"
import test from "node:test"
import { ESLint } from "eslint"
import config from "../src/index.ts"
import reactConfig from "../src/react.ts"
import withoutTypeInference from "../src/without-type-inference.ts"

const source = `export function fromLibation(json) {
	if (!json || typeof json !== "object") throw new Error("Expected a book object")
	const book = json
	const { Title, AuthorNames } = book
	for (const [key, value] of Object.entries({ Title, AuthorNames })) {
		if (typeof value !== "string") throw new Error(key)
	}
	const { PictureId, PictureLarge } = book
	for (const value of [PictureId, PictureLarge]) {
		if (value !== null && typeof value !== "string") { throw new Error("Expected a string or null") }
	}
	if (!book.Title.trim()) throw new Error("Missing title")
	if (!Number.isInteger(book.LengthInMinutes)) throw new Error("Invalid length")
	const picture = book.PictureId ?? book.PictureLarge
	return { book, picture }
}
`

const expected = `export function fromLibation(json) {
	if (!json || typeof json !== "object") {
		throw new Error("Expected a book object")
	}

	const book = json
	const { Title, AuthorNames } = book

	for (const [key, value] of Object.entries({ Title, AuthorNames })) {
		if (typeof value !== "string") {
			throw new Error(key)
		}
	}

	const { PictureId, PictureLarge } = book

	for (const value of [PictureId, PictureLarge]) {
		if (value !== null && typeof value !== "string") {
			throw new Error("Expected a string or null")
		}
	}

	if (!book.Title.trim()) {
		throw new Error("Missing title")
	}

	if (!Number.isInteger(book.LengthInMinutes)) {
		throw new Error("Invalid length")
	}

	const picture = book.PictureId ?? book.PictureLarge

	return { book, picture }
}
`

for (const [name, sharedConfig] of Object.entries({ config, reactConfig, withoutTypeInference })) {
	for (const filePath of ["formatting.js", "formatting.config.ts"]) {
		void test(`${name} formats validation blocks in ${filePath} without moving declarations`, async () => {
			const options = { overrideConfigFile: true as const, overrideConfig: sharedConfig }
			const eslint = new ESLint(options)
			const [result] = await eslint.lintText(source, { filePath })

			assert.ok(result)
			const ruleNames = new Set(result.messages.map(message => message.ruleId))

			assert.ok(ruleNames.has("curly"))
			assert.ok(ruleNames.has("@stylistic/brace-style"))
			assert.ok(ruleNames.has("@stylistic/padding-line-between-statements"))

			const fixer = new ESLint({ ...options, fix: true })
			const [fixed] = await fixer.lintText(source, { filePath })

			assert.ok(fixed)
			assert.deepEqual(fixed.messages, [])
			assert.equal(fixed.output, expected)

			const [rechecked] = await fixer.lintText(expected, { filePath })

			assert.ok(rechecked)
			assert.deepEqual(rechecked.messages, [])
			assert.equal(rechecked.output, undefined)
		})
	}
}

void test("all loop forms require braces and blank lines", async () => {
	const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config, fix: true })

	for (const loop of [
		"for (let index = 0; index < 2; index++) consume(index)",
		"for (const key in values) consume(key)",
		"for (const value of values) consume(value)",
		"while (values.length) consume(values.pop())",
		"do consume(values.pop()); while (values.length)",
	]) {
		const [result] = await eslint.lintText(`export function visit(values, consume) {
	consume("start")
	${loop}
	consume("end")
}
`, { filePath: "formatting.js" })

		assert.ok(result)
		assert.deepEqual(result.messages, [])
		assert.ok(result.output)
		assert.match(result.output, /consume\("start"\)\n\n\t(?:for|while|do)\b/v)
		assert.match(result.output, /\{\n\t\tconsume\(/v)
		assert.match(result.output, /\n\n\tconsume\("end"\)/v)
	}
})

void test("padding separates switch and try statements and preserves else/catch/finally chains", async () => {
	const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config, fix: true })
	const [result] = await eslint.lintText(`export function visit(value, consume) {
	consume("start")
	switch (value) {
		default:
			consume(value)
	}
	try {
		if (value) { consume(value) } else if (value === null) { consume("null") } else { consume("other") }
	} catch { consume("error") } finally { consume("done") }
	consume("end")
}
`, { filePath: "formatting.js" })

	assert.ok(result)
	assert.deepEqual(result.messages, [])
	assert.equal(result.output, `export function visit(value, consume) {
	consume("start")

	switch (value) {
		default:
			consume(value)
	}

	try {
		if (value) {
			consume(value)
		}
		else if (value === null) {
			consume("null")
		}
		else {
			consume("other")
		}
	}
	catch {
		consume("error")
	}
	finally {
		consume("done")
	}

	consume("end")
}
`)
})

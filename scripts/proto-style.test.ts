import assert from "node:assert/strict"
import test from "node:test"
import { lintProtoText } from "../src/proto-style.ts"

void test("proto-style accepts tab-indented proto source", () => {
	const issues = lintProtoText(
		"example.proto",
		`syntax = "proto3";\n\nmessage Example {\n\tstring value = 1;\n}\n`,
	)

	assert.deepEqual(issues, [])
})

void test("proto-style rejects spaces used for indentation", () => {
	const issues = lintProtoText(
		"example.proto",
		`message Example {\n  string value = 1;\n}\n`,
	)

	assert.deepEqual(
		issues.map(issue => issue.rule),
		["indentation"],
	)
})

void test("proto-style rejects trailing whitespace, CRLF, and a missing final newline", () => {
	const trailingWhitespaceIssues = lintProtoText(
		"trailing.proto",
		`message Example {\n\tstring value = 1;\t\n}\n`,
	)
	assert.deepEqual(
		trailingWhitespaceIssues.map(issue => issue.rule),
		["trailing-whitespace"],
	)

	const lineEndingIssues = lintProtoText(
		"line-ending.proto",
		"message Example {\r\n\tstring value = 1;\r\n}\r\n",
	)
	assert.equal(
		lineEndingIssues.filter(issue => issue.rule === "line-ending").length,
		3,
	)

	const finalNewlineIssues = lintProtoText(
		"final-newline.proto",
		`syntax = "proto3";`,
	)
	assert.deepEqual(
		finalNewlineIssues.map(issue => issue.rule),
		["final-newline"],
	)
})

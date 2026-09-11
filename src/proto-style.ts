import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import process from "node:process"

type ProtoStyleRule =
	"final-newline" |
	"indentation" |
	"line-ending" |
	"trailing-whitespace"

interface ProtoStyleIssue {
	filePath: string,
	line: number,
	column: number,
	rule: ProtoStyleRule,
	message: string,
}

const ignoredDirectoryNames = new Set([
	".git",
	"coverage",
	"dist",
	"node_modules",
])

function addProtoFiles(inputPath: string, files: Set<string>) {
	const absolutePath = path.resolve(inputPath)
	if (!existsSync(absolutePath)) {
		throw new Error(`Path does not exist: ${inputPath}`)
	}

	const stats = statSync(absolutePath)
	if (stats.isFile()) {
		if (absolutePath.endsWith(".proto")) {
			files.add(absolutePath)
		}
		return
	}
	if (!stats.isDirectory()) {
		return
	}

	const entries = readdirSync(absolutePath, { withFileTypes: true })
		.sort((left, right) => left.name.localeCompare(right.name))

	for (const entry of entries) {
		if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
			continue
		}
		if (!entry.isDirectory() && !entry.isFile()) {
			continue
		}
		addProtoFiles(path.join(absolutePath, entry.name), files)
	}
}

export function lintProtoText(filePath: string, text: string) {
	const issues: ProtoStyleIssue[] = []
	const lines = text.split("\n")

	for (let index = 0; index < lines.length; index += 1) {
		const rawLine = lines[index] ?? ""
		const carriageReturnIndex = rawLine.indexOf("\r")
		if (carriageReturnIndex >= 0) {
			issues.push({
				filePath,
				line: index + 1,
				column: carriageReturnIndex + 1,
				rule: "line-ending",
				message: "Line endings must use LF, not CRLF or CR.",
			})
		}

		const line = rawLine.replaceAll("\r", "")
		const indentation = /^[\t ]+/.exec(line)?.[0]
		if (line.trim().length > 0 && indentation?.includes(" ")) {
			issues.push({
				filePath,
				line: index + 1,
				column: indentation.indexOf(" ") + 1,
				rule: "indentation",
				message: "Indentation must use tabs, not spaces.",
			})
		}

		const trailingWhitespace = /[\t ]+$/.exec(line)?.[0]
		if (trailingWhitespace) {
			issues.push({
				filePath,
				line: index + 1,
				column: line.length - trailingWhitespace.length + 1,
				rule: "trailing-whitespace",
				message: "Trailing whitespace is not allowed.",
			})
		}
	}

	if (text.length > 0 && !text.endsWith("\n")) {
		const lastLine = lines.at(-1) ?? ""
		issues.push({
			filePath,
			line: lines.length,
			column: lastLine.length + 1,
			rule: "final-newline",
			message: "File must end with a newline.",
		})
	}

	return issues
}

export function lintProtoPaths(inputPaths: readonly string[]) {
	const files = new Set<string>()
	const pathsToCheck = inputPaths.length > 0 ? inputPaths : ["."]

	for (const inputPath of pathsToCheck) {
		addProtoFiles(inputPath, files)
	}

	const issues: ProtoStyleIssue[] = []
	for (const filePath of [...files].sort()) {
		const displayPath = path.relative(process.cwd(), filePath) || path.basename(filePath)
		issues.push(...lintProtoText(displayPath, readFileSync(filePath, "utf8")))
	}
	return issues
}

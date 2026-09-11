#!/usr/bin/env node
import process from "node:process"
import { lintProtoPaths } from "../proto-style.js"

function printHelp() {
	process.stdout.write(
		"Usage: proto-style [path ...]\n\n"
		+ "Checks .proto files recursively. With no paths, checks the current directory.\n",
	)
}

const args = process.argv.slice(2)
if (args.includes("--help") || args.includes("-h")) {
	printHelp()
}
else {
	const invalidOption = args.find(arg => arg.startsWith("-"))
	if (invalidOption) {
		process.stderr.write(`Unknown option: ${invalidOption}\n`)
		process.exitCode = 2
	}
	else {
		try {
			const issues = lintProtoPaths(args)
			for (const issue of issues) {
				process.stderr.write(
					`${issue.filePath}:${issue.line}:${issue.column}: error: ${issue.message} [proto-style/${issue.rule}]\n`,
				)
			}
			if (issues.length > 0) {
				process.exitCode = 1
			}
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			process.stderr.write(`${message}\n`)
			process.exitCode = 2
		}
	}
}

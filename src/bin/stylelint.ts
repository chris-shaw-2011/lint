#!/usr/bin/env node
import { fileURLToPath } from "node:url"
import { runTool } from "./run-tool.js"

const args = process.argv.slice(2)
const hasConfig = args.some(argument => (
	argument === "--config" ||
	argument === "-c" ||
	argument.startsWith("--config=")
))

if (!hasConfig) {
	args.push("--config", fileURLToPath(new URL("../stylelint.js", import.meta.url)))
}

runTool("stylelint", "stylelint", args)

#!/usr/bin/env node
import { runTool } from "./run-tool.js"

runTool("eslint", "eslint", process.argv.slice(2))

#!/usr/bin/env node
import { runTool } from "./run-tool.js"

runTool("knip", "knip", process.argv.slice(2))

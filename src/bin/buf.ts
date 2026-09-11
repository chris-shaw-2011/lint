#!/usr/bin/env node
import { runTool } from "./run-tool.js"

runTool("@bufbuild/buf", "buf", process.argv.slice(2))

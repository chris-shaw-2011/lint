#!/usr/bin/env node
import { runScssModulesUnusedCli } from "../scss-modules-unused.js"

process.exitCode = runScssModulesUnusedCli(process.argv.slice(2))

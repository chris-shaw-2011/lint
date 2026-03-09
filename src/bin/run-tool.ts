#!/usr/bin/env node
import { spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { createRequire } from "node:module"

interface PackageJsonWithBin {
	name?: string,
	bin?: string | Record<string, string>,
}

const require = createRequire(import.meta.url)

function resolvePackageJsonPath(packageName: string): string {
	try {
		return require.resolve(`${packageName}/package.json`)
	}
	catch {
		const entryPath = require.resolve(packageName)
		let currentDir = path.dirname(entryPath)

		for (;;) {
			const candidate = path.join(currentDir, "package.json")
			if (existsSync(candidate)) {
				const packageJson = JSON.parse(readFileSync(candidate, "utf8")) as PackageJsonWithBin
				if (packageJson.name === packageName) {
					return candidate
				}
			}

			const parent = path.dirname(currentDir)
			if (parent === currentDir) {
				break
			}
			currentDir = parent
		}
	}

	throw new Error(`Unable to resolve package.json for '${packageName}'.`)
}

function resolveBinPath(packageName: string, binName: string): string {
	const packageJsonPath = resolvePackageJsonPath(packageName)
	const packageRoot = path.dirname(packageJsonPath)
	const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJsonWithBin

	if (typeof packageJson.bin === "string") {
		return path.join(packageRoot, packageJson.bin)
	}

	if (packageJson.bin && typeof packageJson.bin === "object") {
		if (binName in packageJson.bin) {
			return path.join(packageRoot, packageJson.bin[binName])
		}

		const firstBin = Object.values(packageJson.bin)[0]
		if (firstBin) {
			return path.join(packageRoot, firstBin)
		}
	}

	throw new Error(`Package '${packageName}' does not expose a usable bin entry.`)
}

export function runTool(packageName: string, binName: string, args: string[]): void {
	const resolvedBin = resolveBinPath(packageName, binName)
	const child = spawn(process.execPath, [resolvedBin, ...args], {
		stdio: "inherit",
		env: process.env,
	})

	child.on("error", error => {
		const message = error instanceof Error ? (error.stack ?? error.message) : String(error)
		process.stderr.write(`${message}\n`)
		process.exit(1)
	})

	child.on("exit", (code, signal) => {
		if (typeof code === "number") {
			process.exit(code)
		}
		if (signal) {
			process.kill(process.pid, signal)
			return
		}
		process.exit(1)
	})
}

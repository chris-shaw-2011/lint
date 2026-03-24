import { chmodSync, existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

export const binFiles = ["eslint.js", "knip.js", "run-tool.js", "sherif.js"] as const

export function markBinExecutable(distBinDir: string, fileNames: readonly string[] = binFiles): void {
	for (const fileName of fileNames) {
		const filePath = path.join(distBinDir, fileName)
		if (!existsSync(filePath)) {
			continue
		}
		chmodSync(filePath, 0o755)
	}
}

const scriptPath = fileURLToPath(import.meta.url)

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
	const scriptsDir = path.dirname(scriptPath)
	const distBinDir = path.resolve(scriptsDir, "../dist/bin")
	markBinExecutable(distBinDir)
}

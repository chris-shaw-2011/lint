import { chmodSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import assert from "node:assert/strict"
import { binFiles, markBinExecutable } from "./mark-bin-executable.ts"

void test("markBinExecutable makes known bin files executable without touching missing files", () => {
	const tempDir = mkdtempSync(path.join(tmpdir(), "mark-bin-executable-"))

	try {
		const existingFiles = [binFiles[0], binFiles[1]]

		for (const fileName of existingFiles) {
			const filePath = path.join(tempDir, fileName)
			writeFileSync(filePath, "#!/usr/bin/env node\n")
			chmodSync(filePath, 0o644)
		}

		markBinExecutable(tempDir)

		for (const fileName of existingFiles) {
			const filePath = path.join(tempDir, fileName)
			const mode = statSync(filePath).mode & 0o777
			assert.equal(mode, 0o755)
		}

		const missingFilePath = path.join(tempDir, binFiles[2])
		assert.doesNotThrow(() => markBinExecutable(tempDir, [path.basename(missingFilePath)]))
	}
	finally {
		rmSync(tempDir, { recursive: true, force: true })
	}
})

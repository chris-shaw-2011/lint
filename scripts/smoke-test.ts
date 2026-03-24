#!/usr/bin/env node
import { execFileSync } from "node:child_process"
import type { ExecFileSyncOptionsWithBufferEncoding } from "node:child_process"
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function run(
	command: string,
	args: string[],
	options: ExecFileSyncOptionsWithBufferEncoding = {},
): void {
	process.stdout.write(`$ ${command} ${args.join(" ")}\n`)
	execFileSync(command, args, {
		stdio: "inherit",
		...options,
	})
}

function writeFile(filePath: string, content: string): void {
	mkdirSync(path.dirname(filePath), { recursive: true })
	writeFileSync(filePath, content)
}

function writeJson(filePath: string, value: unknown): void {
	writeFile(filePath, `${JSON.stringify(value, null, "\t")}\n`)
}

const tempRoot = mkdtempSync(path.join(tmpdir(), "lint-smoke-"))
const fixtureRoot = path.join(tempRoot, "workspace")
const npmCachePath = path.join(tempRoot, ".npm-cache")

try {
	run("npm", ["pack", "--pack-destination", tempRoot], {
		cwd: repoRoot,
		env: {
			...process.env,
			npm_config_cache: npmCachePath,
		},
	})
	const tarballName = readdirSync(tempRoot).find(file => file.endsWith(".tgz"))
	if (!tarballName) {
		throw new Error("Unable to find packed tarball.")
	}
	const tarballPath = path.join(tempRoot, tarballName)

	writeJson(path.join(fixtureRoot, "package.json"), {
		name: "lint-smoke-workspace",
		private: true,
		type: "module",
		packageManager: "npm@11.6.2",
		workspaces: ["packages/*"],
		scripts: {
			"lint": "npm run lint:root && npm run lint:workspaces",
			"lint:root": "eslint . --ignore-pattern \"packages/**\"",
			"lint:workspaces": "npm run lint --workspaces --if-present",
			"knip": "knip",
			"sherif": "sherif",
		},
		devDependencies: {
			"@chris-shaw-2011/lint": `file:${tarballPath}`,
		},
	})

	writeJson(path.join(fixtureRoot, "tsconfig.json"), {
		compilerOptions: {
			target: "ES2022",
			module: "NodeNext",
			moduleResolution: "NodeNext",
			strict: true,
			noEmit: true,
		},
		include: ["src/**/*.ts", "eslint.config.ts"],
	})

	writeFile(
		path.join(fixtureRoot, "knip.config.ts"),
		`import {\n\tcreateKnipConfig,\n\trootWorkspaceConfig,\n\tworkspaceConfig,\n} from "@chris-shaw-2011/lint/knip"\n\nexport default createKnipConfig({\n\tworkspaces: {\n\t\t".": rootWorkspaceConfig({\n\t\t\tentry: ["src/index.ts"],\n\t\t}),\n\t\t"packages/ts-lib": workspaceConfig({\n\t\t\tentry: ["src/index.ts"],\n\t\t}),\n\t\t"packages/react-app": workspaceConfig({\n\t\t\tentry: ["src/App.tsx"],\n\t\t}),\n\t},\n})\n`,
	)

	writeFile(
		path.join(fixtureRoot, "eslint.config.ts"),
		`import config from "@chris-shaw-2011/lint"\n\nexport default [\n\t...config,\n\t{\n\t\tfiles: ["src/**/*.ts"],\n\t},\n]\n`,
	)

	writeFile(
		path.join(fixtureRoot, "src/index.ts"),
		`const message = "lint smoke"\n\nexport function toTitle(value: string): string {\n\treturn \`\${message}: \${value}\`\n}\n`,
	)

	writeJson(path.join(fixtureRoot, "packages/ts-lib/package.json"), {
		name: "@smoke/ts-lib",
		private: true,
		type: "module",
		scripts: {
			"lint": "eslint .",
			"lint:fix": "eslint . --fix",
		},
	})

	writeJson(path.join(fixtureRoot, "packages/ts-lib/tsconfig.json"), {
		compilerOptions: {
			target: "ES2022",
			module: "NodeNext",
			moduleResolution: "NodeNext",
			strict: true,
			noEmit: true,
		},
		include: ["src/**/*.ts", "eslint.config.ts"],
	})

	writeFile(
		path.join(fixtureRoot, "packages/ts-lib/eslint.config.ts"),
		`import config from "@chris-shaw-2011/lint"\n\nexport default [\n\t...config,\n\t{\n\t\tfiles: ["src/**/*.ts"],\n\t},\n]\n`,
	)

	writeFile(
		path.join(fixtureRoot, "packages/ts-lib/src/index.ts"),
		`export function add(left: number, right: number): number {\n\treturn left + right\n}\n`,
	)

	writeJson(path.join(fixtureRoot, "packages/react-app/package.json"), {
		name: "@smoke/react-app",
		private: true,
		type: "module",
		scripts: {
			"lint": "eslint .",
			"lint:fix": "eslint . --fix",
		},
		dependencies: {
			react: "19.2.4",
		},
	})

	writeJson(path.join(fixtureRoot, "packages/react-app/tsconfig.json"), {
		compilerOptions: {
			target: "ES2022",
			module: "NodeNext",
			moduleResolution: "NodeNext",
			strict: true,
			jsx: "react-jsx",
			noEmit: true,
		},
		include: ["src/**/*.ts", "src/**/*.tsx", "eslint.config.ts"],
	})

	writeFile(
		path.join(fixtureRoot, "packages/react-app/eslint.config.ts"),
		`import config from "@chris-shaw-2011/lint/react"\n\nexport default [\n\t...config,\n\t{\n\t\tfiles: ["src/**/*.{ts,tsx}"],\n\t},\n]\n`,
	)

	writeFile(
		path.join(fixtureRoot, "packages/react-app/src/App.tsx"),
		`import type { JSX } from "react"\n\ninterface AppProps {\n\tlabel: string,\n}\n\nexport function App({ label }: AppProps): JSX.Element {\n\treturn <div>{label}</div>\n}\n`,
	)

	const npmEnv = {
		...process.env,
		npm_config_cache: npmCachePath,
	}

	run("npm", ["install"], { cwd: fixtureRoot, env: npmEnv })
	const eslintBinPath = path.join(fixtureRoot, "node_modules/.bin/eslint")
	const eslintBinMode = statSync(eslintBinPath).mode & 0o111
	if (eslintBinMode === 0) {
		throw new Error(`Installed eslint shim is not executable: ${eslintBinPath}`)
	}
	run("npm", ["run", "lint:root"], { cwd: fixtureRoot, env: npmEnv })
	run("npm", ["run", "lint:workspaces"], { cwd: fixtureRoot, env: npmEnv })
	run("npm", ["run", "lint", "-w", "@smoke/ts-lib"], { cwd: fixtureRoot, env: npmEnv })
	run("npm", ["run", "knip", "--", "--config", "knip.config.ts", "--reporter", "compact"], {
		cwd: fixtureRoot,
		env: npmEnv,
	})
	run("npm", ["run", "sherif", "--", "."], { cwd: fixtureRoot, env: npmEnv })
	run(
		"node",
		[
			"--input-type=module",
			"-e",
			"import { createKnipConfig, rootWorkspaceConfig, workspaceConfig } from '@chris-shaw-2011/lint/knip'; const config = createKnipConfig({ workspaces: { '.': rootWorkspaceConfig(), 'packages/*': workspaceConfig() } }); if (!Array.isArray(config.entry) || !config.entry.includes('**/eslint.config.{js,mjs,cjs,ts,mts,cts}') || !config.entry.includes('**/knip.config.{js,mjs,cjs,ts,mts,cts}')) { throw new Error('Missing shared knip entry patterns') }",
		],
		{ cwd: fixtureRoot },
	)

	process.stdout.write("Smoke test passed.\n")
}
finally {
	rmSync(tempRoot, { recursive: true, force: true })
}

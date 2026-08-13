import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import assert from "node:assert/strict"
import {
	findUnusedScssModuleClasses,
	runScssModulesUnusedCli,
} from "../src/scss-modules-unused.ts"

function writeFile(filePath: string, content: string) {
	mkdirSync(path.dirname(filePath), { recursive: true })
	writeFileSync(filePath, content)
}

function writeJson(filePath: string, value: unknown) {
	writeFile(filePath, `${JSON.stringify(value, null, "\t")}\n`)
}

function createFixture() {
	const root = mkdtempSync(path.join(tmpdir(), "scss-modules-unused-"))
	const projectRoot = path.join(root, "packages/client")
	writeJson(path.join(root, "package.json"), {
		private: true,
		workspaces: ["packages/*"],
	})
	writeJson(path.join(projectRoot, "tsconfig.json"), {
		compilerOptions: {
			module: "ESNext",
			moduleResolution: "Bundler",
			rootDirs: [".", ".generated"],
			strict: true,
		},
		include: [".generated/**/*.d.ts", "src/**/*.ts", "src/**/*.tsx"],
	})
	return { projectRoot, root }
}

function writeModule(
	projectRoot: string,
	name: string,
	classNames: string[],
) {
	writeFile(
		path.join(projectRoot, `src/${name}.module.scss`),
		`${classNames.map(className => `.${className} { color: red; }`).join("\n")}\n:global(.external) { color: blue; }\n`,
	)
	writeFile(
		path.join(projectRoot, `.generated/src/${name}.module.scss.d.ts`),
		`export type Styles = {\n${classNames.map(className => `\t"${className}": string;`).join("\n")}\n}\nexport type ClassNames = keyof Styles\ndeclare const styles: Styles\nexport default styles\n`,
	)
}

void test("finds unused classes while aggregating supported usage across a rootDirs workspace", () => {
	const { projectRoot, root } = createFixture()
	try {
		writeModule(projectRoot, "Main", [
			"directClass",
			"bracketClass",
			"destructured",
			"renamed",
			"secondImporter",
			"primary",
			"secondary",
			"keyedOne",
			"keyedTwo",
			"unusedClass",
		])
		writeFile(
			path.join(projectRoot, "src/first.tsx"),
			`import buttonStyles, { type ClassNames, type Styles } from "./Main.module.scss"\n\nbuttonStyles.directClass\nbuttonStyles["bracketClass"]\nconst { destructured, renamed: localName } = buttonStyles\nvoid destructured\nvoid localName\nconst variant: "primary" | "secondary" = Math.random() ? "primary" : "secondary"\nbuttonStyles[variant]\nconst key: keyof Styles = Math.random() ? "keyedOne" : "keyedTwo"\nbuttonStyles[key]\nconst className: ClassNames = "directClass"\nvoid className\n`,
		)
		writeFile(
			path.join(projectRoot, "src/second.ts"),
			`import styles from "./Main.module.scss"\nstyles.secondImporter\n`,
		)

		writeModule(projectRoot, "Dynamic", ["dynamicOne", "dynamicTwo"])
		writeFile(
			path.join(projectRoot, "src/dynamic.ts"),
			`import styles from "./Dynamic.module.scss"\ndeclare const key: string\nstyles[key]\n`,
		)
		writeModule(projectRoot, "Escaped", ["escapedOne", "escapedTwo"])
		writeFile(
			path.join(projectRoot, "src/escaped.ts"),
			`import styles from "./Escaped.module.scss"\ndeclare function consume(value: object): void\nconsume(styles)\n`,
		)
		writeModule(projectRoot, "Animation", ["spinner", "spin"])
		writeFile(
			path.join(projectRoot, "src/Animation.module.scss"),
			`.spinner { animation: spin 1s linear infinite; }\n@keyframes spin { to { transform: rotate(360deg); } }\n`,
		)
		writeFile(
			path.join(projectRoot, "src/animation.ts"),
			`import styles from "./Animation.module.scss"\nstyles.spinner\n`,
		)

		const result = findUnusedScssModuleClasses(path.join(projectRoot, "tsconfig.json"))
		assert.deepEqual(result.errors, [])
		assert.deepEqual(result.diagnostics.map(diagnostic => diagnostic.className), ["unusedClass"])
		assert.equal(result.diagnostics[0]?.filePath, path.join(projectRoot, "src/Main.module.scss"))
		assert.doesNotMatch(result.diagnostics[0]?.filePath ?? "", /\.generated/)
	}
	finally {
		rmSync(root, { recursive: true, force: true })
	}
})

void test("reports missing declarations with actionable guidance", () => {
	const { projectRoot, root } = createFixture()
	try {
		writeFile(path.join(projectRoot, "src/Missing.module.scss"), ".button { color: red; }\n")
		writeFile(
			path.join(projectRoot, "src/index.ts"),
			`import styles from "./Missing.module.scss"\nvoid styles\n`,
		)

		const result = findUnusedScssModuleClasses(path.join(projectRoot, "tsconfig.json"))
		assert.deepEqual(result.diagnostics, [])
		assert.equal(result.errors.length, 1)
		assert.match(result.errors[0]?.message ?? "", /Generate and validate CSS Module typings/)
		assert.equal(result.errors[0]?.filePath, path.join(projectRoot, "src/Missing.module.scss"))
	}
	finally {
		rmSync(root, { recursive: true, force: true })
	}
})

void test("CLI returns success, unused-class failure, and project-load error exit codes", () => {
	const { projectRoot, root } = createFixture()
	const messages: string[] = []
	const output = {
		error: (message: string) => messages.push(message),
		log: (message: string) => messages.push(message),
	}
	try {
		writeModule(projectRoot, "Success", ["used"])
		writeFile(
			path.join(projectRoot, "src/index.ts"),
			`import styles from "./Success.module.scss"\nstyles.used\n`,
		)
		assert.equal(
			runScssModulesUnusedCli(["--project", "packages/client/tsconfig.json"], root, output),
			0,
		)

		writeModule(projectRoot, "Failure", ["unused"])
		writeFile(
			path.join(projectRoot, "src/failure.ts"),
			`import styles from "./Failure.module.scss"\nvoid styles.unused satisfies string\n`,
		)
		writeModule(projectRoot, "Failure", ["unused", "actuallyUnused"])
		assert.equal(
			runScssModulesUnusedCli(["--project=packages/client/tsconfig.json"], root, output),
			1,
		)
		assert.match(messages.join("\n"), /actuallyUnused/)

		assert.equal(runScssModulesUnusedCli(["--project", "missing.json"], root, output), 2)
		assert.match(messages.join("\n"), /Unable to load TypeScript project/)
	}
	finally {
		rmSync(root, { recursive: true, force: true })
	}
})

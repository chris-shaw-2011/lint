import type { KnipConfig, WorkspaceProjectConfig } from "knip"

type KnipConfigObject = Exclude<KnipConfig, (...args: unknown[]) => unknown>
type GlobPattern = string | string[]
interface KnipConfigInput {
	entry?: GlobPattern,
	workspaces?: Record<string, WorkspaceProjectConfig>,
	ignoreDependencies?: string[],
	[key: string]: unknown,
}

const codeFilePattern = "**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
const rootCodeFilePattern = "*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
const rootSrcCodeFilePattern = "src/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"
const rootScriptsCodeFilePattern = "scripts/**/*.{js,mjs,cjs,jsx,ts,tsx,mts,cts}"

function arrayify(value?: GlobPattern): string[] {
	if (!value) {
		return []
	}

	return Array.isArray(value) ? value : [value]
}

function unique(values: string[]): string[] {
	return Array.from(new Set(values))
}

export const entryPatterns = [
	"**/eslint.config.{js,mjs,cjs,ts,mts,cts}",
	"**/knip.config.{js,mjs,cjs,ts,mts,cts}",
]

const baseConfig = {
	entry: entryPatterns,
} satisfies KnipConfigObject

export function createKnipConfig(
	config: KnipConfigInput = {},
): KnipConfigObject {
	return {
		...config,
		entry: unique([...baseConfig.entry, ...arrayify(config.entry)]),
	} as KnipConfigObject
}

export function workspaceConfig(
	config: Omit<WorkspaceProjectConfig, "entry" | "project"> & {
		entry?: GlobPattern,
		project?: GlobPattern,
	} = {},
): WorkspaceProjectConfig {
	return {
		...config,
		entry: unique([...baseConfig.entry, ...arrayify(config.entry)]),
		project: config.project ? arrayify(config.project) : [codeFilePattern],
	}
}

export function rootWorkspaceConfig(
	config: Omit<WorkspaceProjectConfig, "entry" | "project"> & {
		entry?: GlobPattern,
		project?: GlobPattern,
	} = {},
): WorkspaceProjectConfig {
	let project = [rootCodeFilePattern, rootSrcCodeFilePattern, rootScriptsCodeFilePattern]

	if (config.project) {
		project = arrayify(config.project)
	}

	return {
		...config,
		entry: unique([...baseConfig.entry, ...arrayify(config.entry)]),
		project,
	}
}

export default baseConfig

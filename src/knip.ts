export interface KnipWorkspaceConfig {
	entry?: string[],
	project?: string[],
	ignore?: string[],
}

export interface KnipBaseConfig {
	ignoreDependencies?: string[],
	workspaces?: Record<string, KnipWorkspaceConfig>,
}

const baseConfig: KnipBaseConfig = {
	ignoreDependencies: [],
	workspaces: {},
}

export default baseConfig

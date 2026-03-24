# @chris-shaw-2011/lint

Shared lint tooling and flat ESLint configs for TypeScript and React projects in npm workspaces.

## Install

### 1) Configure GitHub Packages auth

Create or update `.npmrc` in the consuming repository:

```ini
@chris-shaw-2011:registry=https://npm.pkg.github.com
```

`GITHUB_TOKEN` can be a classic PAT (`read:packages`) for installs and `write:packages` for publishing.

### 2) Install the package

```bash
npm install -D @chris-shaw-2011/lint
```

This installs ESLint + plugins + `knip` + `sherif` as part of the package dependency graph.

## ESLint Usage

### TypeScript config

```ts
// eslint.config.ts
import config from "@chris-shaw-2011/lint"

export default [...config]
```

### React config

```ts
// eslint.config.ts
import config from "@chris-shaw-2011/lint/react"

export default [...config]
```

Add extra config objects only when you need local overrides (for example custom rules, globals, or ignores).

## Workspace Scripts

### Root `package.json`

```json
{
  "scripts": {
    "lint": "npm run lint:root && npm run lint:workspaces",
    "lint:root": "eslint . --ignore-pattern \"packages/**\"",
    "lint:workspaces": "npm run lint --workspaces --if-present",
    "lint:fix": "npm run lint:fix:root && npm run lint:fix --workspaces --if-present",
    "lint:fix:root": "eslint . --fix --ignore-pattern \"packages/**\"",
    "knip": "knip --config knip.config.ts --reporter compact",
    "sherif": "sherif"
  }
}
```

### Workspace package `package.json`

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

## Knip Preset

`@chris-shaw-2011/lint/knip` exports helpers so your `knip.config.ts` can stay small:

```ts
// knip.config.ts
import {
	createKnipConfig,
	rootWorkspaceConfig,
	workspaceConfig,
} from "@chris-shaw-2011/lint/knip"

export default createKnipConfig({
	workspaces: {
		".": rootWorkspaceConfig(),
		"projects/*": workspaceConfig(),
		"projects/client": workspaceConfig({
		  entry: [
			],
		}),
	},
})
```

The shared preset already treats `eslint.config.*` files as Knip entries.

For multi-workspace Knip configs:
- add a `"."` workspace if the repo root has files to analyze
- add a catch-all workspace like `"projects/*"` or `"packages/*"` so every package gets the shared Knip entry patterns
- add more specific workspace entries only when a package needs extra entry files

## Publishing

1. Pushes and pull requests run the `CI` workflow and verify the package with `npm run verify`.
2. Bump version: `npm version patch|minor|major`
3. Push the commit to `main`: `git push`
4. The `publish.yml` workflow runs on pushes to `main` and publishes to GitHub Packages only when the current `package.json` version has not already been published.

## Repository Checks

This repository lints itself with `eslint.config.ts` (which extends `src/index.ts`) and includes local `knip` + `sherif` checks.

```bash
npm run lint
npm run typecheck
npm run knip
npm run sherif
npm run publint
npm run attw
npm run check
```

Markdown files are linted by default via the shared ESLint config.

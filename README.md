# @chris-shaw-2011/lint

Shared lint tooling and configs for TypeScript, React, and SCSS projects in npm workspaces.

## Install

### 1) Configure GitHub Packages auth

Create or update `.npmrc` in the consuming repository:

```ini
@chris-shaw-2011:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` can be a classic PAT (`read:packages`) for installs and `write:packages` for publishing.

### 2) Install the package

```bash
npm install -D @chris-shaw-2011/lint
```

This installs ESLint + plugins + `knip` + `sherif` as part of the package dependency graph.
It also installs Stylelint, `stylelint-scss`, and the shared SCSS presets.

The package bundles TypeScript 6 and its `ts-api-utils` runtime for `typescript-eslint`.
Consuming projects can install TypeScript 7 separately: their compiler uses TypeScript 7,
while this package's linting stack continues to use TypeScript 6.

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

## SCSS Usage

Add one script to lint every SCSS file. The included `stylelint` command automatically uses this
package's shared config, so consumers do not need a `stylelint.config.*` file:

```json
{
  "scripts": {
    "lint:scss": "stylelint \"**/*.scss\"",
    "lint:scss:fix": "stylelint \"**/*.scss\" --fix"
  }
}
```

The preset includes `stylelint-config-standard-scss`, which contains the recommended SCSS rules
from `stylelint-scss`, plus the maintained Stylelint stylistic preset. It uses tabs and double
quotes to match this package's ESLint conventions. It also enforces camelCase class selectors and
supports the CSS Modules `:global` pseudo-class while continuing to reject other unknown
pseudo-classes. Consumers do not need to repeat these rules in a local Stylelint config.

For local overrides, add a `stylelint.config.ts` and pass it to the command:

```ts
import sharedConfig from "@chris-shaw-2011/lint/stylelint"
import type { Config } from "stylelint"

export default {
	...sharedConfig,
	rules: {
		...sharedConfig.rules,
		"color-named": "never",
	},
} satisfies Config
```

```json
{
  "scripts": {
    "lint:scss": "stylelint \"**/*.scss\" --config stylelint.config.ts"
  }
}
```

### `eslint-plugin-type-inference`

When linting `eslint-plugin-type-inference` itself, use the configuration without
the installed plugin and register the local implementation instead:

```ts
// eslint.config.ts
import sharedConfig from "@chris-shaw-2011/lint/without-type-inference"
import localTypeInference from "./src/index.ts"

export default [
	...sharedConfig,
	{
		plugins: {
			"type-inference": localTypeInference,
		},
		rules: {
			"type-inference/no-inferrable-return-type": "error",
		},
	},
]
```

This excludes only the type-inference integration. All other shared lint rules remain enabled.

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
	type SharedKnipConfig,
} from "@chris-shaw-2011/lint/knip"

const config: SharedKnipConfig = createKnipConfig({
	workspaces: {
		".": rootWorkspaceConfig(),
		"projects/*": workspaceConfig(),
		"projects/client": workspaceConfig({
		  entry: [
			],
		}),
	},
})

export default config
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

This repository lints itself with `eslint.config.ts` (which extends `src/index.ts`) and includes a local Knip check. Sherif remains part of the published toolchain and is exercised against a real npm workspace by the smoke test.

```bash
npm run lint
npm run typecheck
npm run knip
npm run publint
npm run attw
npm run check
```

Markdown files are linted by default via the shared ESLint config.

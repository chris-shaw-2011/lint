# @chris-shaw-2011/lint

Shared lint tooling and configs for TypeScript, React, SCSS, and Protobuf projects in npm workspaces.

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

This installs ESLint + plugins + `knip` + `sherif` + Buf as part of the package dependency graph.
It also installs Stylelint, `stylelint-scss`, and the shared SCSS presets.
The package also ships a shared Buf policy using Buf's `STANDARD` Protobuf lint rules.

The package bundles TypeScript 6, its `ts-api-utils` runtime, and the ESLint React runtime for
type-aware linting.
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

The React config uses ESLint React's `strict-type-checked` preset across its React/core, JSX,
React Server Components, DOM, Web API, and naming-convention rule families. It enables additional
rules for DOM properties, explicitly passed React-special props, duplicate keys, display names,
and unused state. The official React Hooks and React Refresh recommended presets remain enabled;
overlapping ESLint React hook/compiler rules are disabled so each problem has one diagnostic.

The React config assumes typed React code. It does not retain legacy validation for untyped
`propTypes`, string refs, `isMounted`, or class render methods.

Add extra config objects only when you need local overrides (for example custom rules, globals, or ignores).

## Protobuf Usage

The included `buf` command uses the package's pinned Buf CLI dependency. Configure each consuming
repository with a `buf.yaml` that identifies its Protobuf module and references the shared policy:

```yaml
version: v2
modules:
  - path: proto
policies:
  - policy: node_modules/@chris-shaw-2011/lint/buf.policy.yaml
```

Change `proto` if the repository stores `.proto` files somewhere else.

Add Buf and the included zero-dependency `proto-style` checker to the repository's lint scripts:

```json
{
  "scripts": {
    "lint:proto": "buf lint && proto-style"
  }
}
```

Then include `npm run lint:proto` in the repository's normal lint/check pipeline. Buf's shared
policy currently enables its recommended `STANDARD` rule set. `proto-style` recursively checks
`.proto` files from the current directory and enforces source-only conventions that do not affect
generated code:

- indentation must use tabs rather than spaces
- trailing whitespace is rejected
- line endings must use LF
- files must end with a newline

You can also pass one or more files or directories directly, for example
`proto-style proto shared/proto`.

### VS Code

Install the official `bufbuild.vscode-buf` extension to surface build and lint diagnostics directly
on `.proto` files. The extension can use the project-local Buf executable:

```json
{
  "buf.commandLine.path": "./node_modules/.bin/buf"
}
```

This keeps command-line linting and editor diagnostics on the Buf version supplied by this package.

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

### Unused CSS Module classes

Projects that use TypeScript and SCSS CSS Modules can opt in to whole-project unused-class
validation:

```json
{
  "scripts": {
    "lint:scss-modules": "scss-modules-unused --project tsconfig.json"
  }
}
```

Run checks in this order:

1. Generate CSS Module declarations and check that they are current.
2. Run `stylelint`.
3. Run `scss-modules-unused`.
4. Run `eslint`.

For example:

```json
{
  "scripts": {
    "lint": "npm run scss-types:check && npm run lint:scss && npm run lint:scss-modules && eslint ."
  }
}
```

The consumer owns declaration generation because projects may choose different generators,
class-name formats, and output layouts. The checker uses this package's bundled TypeScript runtime
to read the default export type visible through the supplied TypeScript project, including
declarations resolved through `rootDirs`; it does not depend on a particular SCSS type generator.

The command checks only imported `*.module.scss` files. It recognizes property access, string-literal
bracket access, object destructuring, and computed keys with statically known string-literal types.
When the complete styles object escapes analysis or is indexed by an unrestricted string, the checker
conservatively treats that module's classes as used. Generated properties that correspond to a
statically declared local `@keyframes` name are excluded because they are not classes. The checker
reports unused exported classes against the
source `.module.scss` path and exits nonzero. It does not inspect arbitrary global SCSS, infer exports
from SCSS syntax, or provide a fix mode. Selectors under `:global` are excluded when they are absent
from the generated default-export type.

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

# @chris-shaw-2011/lint

Shared lint tooling and flat ESLint configs for TypeScript and React projects in npm workspaces.

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
    "knip": "knip --reporter compact",
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

`@chris-shaw-2011/lint/knip` exports a base object that you can extend in a JS/TS Knip config:

```ts
// knip.config.ts
import baseConfig from "@chris-shaw-2011/lint/knip"

export default {
  ...baseConfig,
  workspaces: {
    ...baseConfig.workspaces,
    "packages/client": {
      entry: ["src/main.tsx", "vite.config.ts", "index.html"],
      project: ["src/**/*.{ts,tsx}"]
    }
  }
}
```

Then run:

```bash
knip --config knip.config.ts --reporter compact
```

## Publishing

1. Bump version: `npm version patch|minor|major`
2. Push commit and tags: `git push && git push --tags`
3. The `publish.yml` workflow publishes tag builds (`v*`) to GitHub Packages.

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

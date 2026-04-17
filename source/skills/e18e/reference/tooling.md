# Tooling Reference

The tools e18e work tends to reach for. Most are optional — pick the ones that fit the task.

## Analysis

### `@e18e/cli`
The first tool to reach for on an unfamiliar project. Surfaces dep-tree issues, known bad deps, publint-style concerns.

```bash
npx @e18e/cli analyze              # scan cwd
npx @e18e/cli analyze path/to/proj # scan a path
npx @e18e/cli analyze --json       # machine-readable
npx @e18e/cli migrate <pkg>        # guided dep swap
npx @e18e/cli migrate --interactive
```

Early-dev tool — read its output as "suggestions from a prior" and verify against the actual code.

### `npmgraph.js.org`
Web tool. Paste a package name, get the full dep tree visualized. Good for "why is this install so big."

### `pkg-size.dev`
Web tool. Paste a package name, get install size, publish size, dep count. The number a library's consumers care about.

### `npm why` / `pnpm why` / `yarn why` / `bun pm why`
Local tool. Given a dep, shows every path in the tree that pulls it in. Essential for transitive cleanup.

### `npm ls --all`
Full dep tree. Pipe to `wc -l` for a quick dep count before/after a cleanup PR.

### Fuzzyma's `e18e-tools`
> https://github.com/Fuzzyma/e18e-tools

Reverse lookup: which packages pull in a given problematic dep. Useful when deciding where in the tree to file an upstream issue.

## Linters

### `@e18e/eslint-plugin`
The most important single lint dep for e18e work.

```bash
npm install --save-dev @e18e/eslint-plugin
```

Three configs:
- `modernization` — prefer newer syntax/APIs (`prefer-array-at`, `prefer-includes`, `prefer-nullish-coalescing`, `prefer-object-has-own`, etc.)
- `module-replacements` — flags known-bad deps (`ban-dependencies`).
- `performance-improvements` — `prefer-array-some`, `prefer-date-now`, `prefer-regex-test`, `prefer-timer-args`.

```js
// eslint.config.js
import e18e from "@e18e/eslint-plugin";
export default [e18e.configs.recommended];
```

Works with JS ESLint, also supports Oxlint and `package.json` linting via JSON parsers.

### `eslint-plugin-depend`
Flags deps that have a known lighter alternative. Complement to `@e18e/eslint-plugin`.

### `eslint-plugin-barrel-files` / Biome's `noBarrelFile` / Oxlint's `oxc/no-barrel-file`
Flag `index.ts` re-export-only files that defeat tree-shaking.

## Package author tools

### `publint`
> https://publint.dev

Lints a package's published form. Catches `exports` map mistakes, missing `types`, CJS/ESM mixups, bad `main`/`module`/`types` combinations. Run in CI.

```bash
npx publint
```

### `are-the-types-wrong` (`attw`)
> https://arethetypeswrong.github.io

Validates that the package's type exports resolve correctly across the seven main resolution modes (CJS, ESM, node16, bundler, etc.). Catches the "types work locally but break for consumers on a different moduleResolution" class of bug.

```bash
npx attw --pack
```

### `npm pack --dry-run`
Shows exactly what goes into the tarball. Catches accidental inclusion of tests, source maps, node_modules.

## Bundling / size

### `rollup-plugin-visualizer`
For libraries using Rollup/Vite/Rolldown. Generates an interactive treemap of what ended up in the bundle. The first place to look when size regresses.

```bash
npm install --save-dev rollup-plugin-visualizer
```

```js
// rollup.config.js
import { visualizer } from "rollup-plugin-visualizer";
export default { plugins: [visualizer({ open: true })] };
```

### `esbuild --analyze`
If building with esbuild/tsup, `--analyze` prints a plain-text tree of what's in the bundle.

### `bun build --analyze`
Equivalent for Bun.

## Benchmarking

### `tinybench`
The default choice for library micro-benchmarks.

```js
import { Bench } from "tinybench";
const bench = new Bench({ time: 1000 });
bench.add("current", () => { /* ... */ });
bench.add("proposed", () => { /* ... */ });
await bench.run();
console.table(bench.table());
```

### `mitata`
Higher-precision than tinybench; preferred for tight loops where nanosecond-level differences matter.

### `hyperfine`
CLI process benchmarking. Perfect for measuring startup time of tools (`hyperfine './bin/mytool --help'`).

### Node `--cpu-prof` / `--prof`
```bash
node --cpu-prof myscript.js
# produces a CPU.<timestamp>.cpuprofile
# open in Chrome DevTools → Performance → Load profile
```

## Discovery

### [e18e/ecosystem-issues](https://github.com/e18e/ecosystem-issues)
The central tracker for "this dep in the ecosystem needs work." Labels: `needs first contact`, `accepts prs`, `needs alternative`, `umbrella issue`, `has issue`, `has pr`. Look here before opening new upstream issues — someone may have started.

### [e18e/framework-tracker](https://github.com/e18e/framework-tracker)
Dashboard showing which popular libraries have cleaned up which bad deps. Useful for bragging rights and for picking a "still to do" target.

### Discord + Bluesky + Mastodon
e18e's community lives on Discord primarily. When in doubt on whether a change makes sense, ask there.

# Cleanup Reference

> Source: https://e18e.dev/guide/cleanup.html and the curated community manifests at https://github.com/es-tooling/module-replacements.

Cleanup is the most common e18e pillar. The goal: remove code you no longer need to ship.

## What counts as "needs cleanup"

A dep is a cleanup target if any of these are true:

- **Replaceable by a native API** at the project's runtime floor. (Polyfills for APIs the engine now has.)
- **Duplicate of another dep already in the tree** (two globbers, two chalk-likes, two deep-equal libraries).
- **Unused** — declared in `package.json` but not actually imported (common after refactors).
- **Transitively bloating the tree** — a direct dep brings in a large subtree that is only used in one code path.
- **Unmaintained** — last publish was years ago, open PRs ignored, security advisories unhandled.
- **Has a well-known modern replacement** — see the [module-replacements reference](./module-replacements.md).

## Workflow

### 1. Discover

- `npx @e18e/cli analyze` — highest-signal starting point. Surfaces ban-dependency issues and module-replacement hits.
- [`npmgraph`](https://npmgraph.js.org/) — paste the package name; visualize the full tree. Useful for seeing which deps explode into large subtrees.
- [`pkg-size.dev`](https://pkg-size.dev/) — install size, publish size, and the breakdown. For libraries this is the number that matters to consumers.
- `npm ls <dep>` / `pnpm why <dep>` — find who's pulling a dep in.
- [`rollup-plugin-visualizer`](https://github.com/btd/rollup-plugin-visualizer) — for libraries, generates a treemap of what's actually in the bundle.

### 2. Classify

For each candidate dep, decide which case applies:

- **Direct → can remove**: it's a direct dep used nowhere. Delete the import (if any) and the `package.json` entry.
- **Direct → replace with native**: an API now exists. See the native-replacements reference.
- **Direct → replace with leaner dep**: see the module-replacements reference.
- **Direct → duplicate**: pick one implementation, rewrite the other's call sites.
- **Transitive → not actionable locally**: the right fix is upstream. File an issue on the dep that pulls it in, or find an existing issue on [ecosystem-issues](https://github.com/e18e/ecosystem-issues). Do NOT reach for `overrides`/`resolutions` as a first move.

### 3. Measure

Always show before/after for one of:

- Install size (`npm pack --dry-run`, `pkg-size.dev`).
- Bundle size (from the visualizer or bundler output).
- Dep count (`npm ls --all` lines, or `npm ls --json | jq '[.. | .version?] | length'`).

If none of these numbers moved meaningfully, the change probably isn't worth the churn.

### 4. Ship

One cleanup per PR. A PR titled "remove lodash" is reviewable. A PR titled "ecosystem cleanup pass" is not.

## Common cleanup targets (quick hits)

These almost always pay off, in roughly descending order of impact:

1. **Polyfill packages** — `object-assign`, `es6-promise`, `array.prototype.flat`, `is-buffer`, `define-properties`, `has`, `util.promisify`. These are 99% replaceable by the native built-in on any currently-supported Node.
2. **Polyfill-for-ancient-browsers packages** — `left-pad`, `repeat-string`, `function-bind`, `xtend`, `array-uniq`. Trivial to inline.
3. **HTTP client replaced by `fetch`** — `node-fetch`, `axios`, `got` (sometimes), `request`. `fetch` is global on Node ≥18.
4. **File-system sugar** — `fs-extra`, `rimraf`, `mkdirp`. Node's `fs.rm`, `fs.cp`, `fs.mkdir({recursive: true})` cover most uses.
5. **Utility behemoths** — `lodash`, `underscore`. Either replace with `es-toolkit` or inline the 1-3 functions actually used.
6. **Duplicate globbers** — having `glob`, `fast-glob`, and `tinyglobby` all in the tree is common. Pick one.
7. **`chalk` on Node ≥20** — swap for `util.styleText` (native) or `picocolors` (tiny drop-in).

## Do not

- Don't add `overrides` / `resolutions` as the first move. They silently fork a dep; upstream doesn't get fixed; your team inherits the fork.
- Don't remove a dep that's re-exported to your consumers (even transitively via a type). That's a breaking change, not a cleanup.
- Don't batch unrelated swaps. If the bundle shrinks 20% but one of six changes breaks prod, you'll revert all six.
- Don't skip the measurement step. Every cleanup PR should show a diff in install/bundle size, dep count, or something concrete.

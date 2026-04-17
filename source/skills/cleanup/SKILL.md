---
name: cleanup
description: "Remove or swap dependencies to make a project smaller, leaner, and free of polyfills/duplicates/unused deps. Covers the full e18e cleanup pillar: native replacements, module replacements, single-dep targeted swaps, bundle/install size reduction, and dep-tree investigation. Always verified against the live e18e module-replacements manifest. Use when the user wants to clean up dependencies, reduce bundle size, remove polyfills, prefer native APIs, swap a specific dep, or find what's bloating the tree."
argument-hint: "[dep-name | size | native | graph <dep> | empty for full pass]"
user-invocable: true
---

## MANDATORY PREPARATION

Invoke `/e18e` — it contains the Context Gathering Protocol. Run `/e18e teach` first if no context exists. Without the project's Node floor and module-format contract, this skill will recommend swaps that break consumers.

---

**e18e rule: one package at a time.** Every cleanup is a reviewable, revertible change with a measured delta. No batches.

## Modes

| Invocation | Mode | When |
|---|---|---|
| `/cleanup` | Full pass | Initial cleanup work on a project |
| `/cleanup <dep>` | Targeted swap | User names a specific dep to remove/replace |
| `/cleanup size` | Size-focused | User cares about tarball/bundle/install size specifically |
| `/cleanup native` | Native-only | Replace polyfills and modules with built-in platform APIs |
| `/cleanup graph <dep>` | Graph lookup | Investigate who pulls in a dep before acting |

---

## Runtime verification — manifests

**Before recommending a specific replacement**, fetch the live e18e manifests. The static tables in this skill's reference files are a baseline; the manifests are authoritative and updated frequently.

Use WebFetch on:

- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/native.json` — module → native API
- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/preferred.json` — module → preferred module
- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/micro-utilities.json` — module → inline

Fetch once per session when the user first hits a case that needs a replacement recommendation. The fetch is short. Do not skip it — maintainers update the list with new entries and sometimes demote old ones.

If WebFetch is unavailable or the fetch fails, fall back to the static reference files and tell the user the recommendation is from cached data that may be out of date.

---

## Full Pass Workflow

### 1. Inventory

- Read `package.json`: `dependencies`, `devDependencies`, `peerDependencies`, `engines.node`, `type`, `exports`.
- Read the lockfile for the resolved tree.
- Run the mechanical scanners:
  - `npx @e18e/cli analyze` — if the user can run it.
  - `npx depcheck` or `npx knip` — declared-but-unimported deps.
  - `npm ls --all` / `pnpm ls --depth=Infinity` — full tree.

### 2. Classify each candidate

For each questionable dep, assign exactly one category:

| Category | Action |
|---|---|
| Unused | Delete import (if any) and `package.json` entry |
| Replaceable by native | Cross-reference the live `native.json` manifest; gate on Node floor |
| Replaceable by leaner module | Cross-reference the live `preferred.json` manifest |
| Inline-able micro-utility | Cross-reference `micro-utilities.json`; replace with a one-liner |
| Duplicate | Two packages playing the same role — pick one |
| Transitive — not actionable locally | `npm why` to find the direct dep; fix upstream, do NOT reach for `overrides` first |
| Off-limits per `.e18e.md` | Skip |

### 3. Pick ONE target

Rank by:

1. Install/bundle-size reduction (use `pkg-size.dev`).
2. Dep-count reduction (lockfile lines).
3. Risk (drop-in native < API-shape-changing swap).

Tell the user which target you're doing and why. Do not execute multiple in one session.

### 4. Execute

#### Native replacement

```js
// Example: node-fetch → native fetch (Node ≥18)
- import fetch from "node-fetch";
+ // fetch is global on Node ≥18
```

Grep every call site. Native replacements are often close-but-not-identical — verify each.

#### Module replacement

```bash
npx @e18e/cli migrate <pkg>     # if supported
```

Otherwise: add the new dep, remove the old, rewrite imports and call sites, run tests, verify tree-shaking still works.

#### Micro-utility inline

```js
- import arrayLast from "array-last";
- const x = arrayLast(arr);
+ const x = arr.at(-1);
```

One-line swap, remove the dep.

#### Duplicate consolidation

Pick one implementation (see `/levelup` for the usual winners). Rewrite every import of the losing one. Remove the losing dep. Verify with `npm why` that nothing still pulls it in transitively.

#### Unused removal

Confirm with `depcheck`/`knip` AND a manual grep (ts-ignored imports, dynamic requires, config-file references). Remove from `package.json`. Reinstall.

### 5. Measure

Show the delta for at least one of:

- Install size (`pkg-size.dev`, `npm pack --dry-run`).
- Bundle size (visualizer or bundler output).
- Dep count (lockfile lines or `npm ls --all | wc -l`).

If none moved meaningfully, consider whether the change was worth the churn. Security or maintenance reasons still count — just say so explicitly.

### 6. Test, then stop

Run the project's tests. Report the change, the delta, the test result, and any deferred follow-ups. Do NOT chain into the next cleanup.

---

## Targeted mode — `/cleanup <dep>`

The user named a specific dep. Scope is exactly that dep.

1. Confirm it's actually used (grep for imports). If unused, just delete it.
2. Confirm it's a direct dep, not transitive-only. If transitive, stop and offer to help file upstream (see [contributing reference](../e18e/reference/contributing.md)).
3. Fetch the live manifests (see Runtime verification above).
4. Look up the dep in the fetched manifests. If the manifest names a specific replacement, use it; if not, cross-reference the static reference files.
5. Compatibility gates:
   - Node floor: replacement's `engines.node` ≤ project's Node floor.
   - Module format: if the project ships/consumes CJS, the replacement must support `require`.
   - Types: replacement must ship `.d.ts` if the project uses TypeScript.
   All three must pass. If any fails, report what fails and stop.
6. Enumerate every call site; map each to the replacement's equivalent.
7. If call-site count is high (>20) or the API shape differs substantially, tell the user the scope before proceeding.
8. Execute, measure, test, commit.

---

## Size mode — `/cleanup size`

Bundle/install size reduction specifically. Pick the right lens:

- **Library** → target is `npm pack` size + `pkg-size.dev` install size + transitive dep count.
- **App (browser)** → target is gzipped production bundle.
- **App (Node)** → target is `node_modules` size + startup time.

### Library

1. Measure baseline: `npm pack --dry-run`, `pkg-size.dev`.
2. Identify what's in the tarball that shouldn't be. Set `files` in `package.json` (allowlist; preferred over `.npmignore`). Narrow `exports`.
3. `npx depcheck` to find runtime `dependencies` that aren't actually imported.
4. Set `"sideEffects": false` if truthful. Single highest-leverage size win for downstream consumers (unlocks their tree-shaking). Verify by bundling a consumer that imports one named symbol and confirming dead code is dropped.
5. Replace heavy `dependencies` via the manifest lookup above.
6. Run `publint` and `attw --pack` to confirm the publish shape didn't regress (see `/levelup`).

### App (browser)

1. Generate a bundle visualization:
   - Rollup/Vite/Rolldown: `rollup-plugin-visualizer` with `{ gzipSize: true, brotliSize: true, open: true }`.
   - esbuild/tsup: `esbuild --analyze`.
   - webpack: `webpack-bundle-analyzer`.
   - Bun: `bun build --analyze`.
2. Classify the biggest contributors:
   - Single heavy dep → targeted swap (fetch manifests, `/cleanup <that-dep>`).
   - Duplicate versions of one dep → dedupe / `overrides`.
   - Barrel file defeating tree-shaking → deep imports.
   - Polyfills shipped when `browserslist` doesn't need them → tighten browserslist.
   - Dev-only imports leaking into prod → bundler config.
3. Pull one lever, re-run the visualizer, confirm the delta.
4. Code-split route-heavy or feature-heavy deps with `import()`.
5. Re-measure gzipped AND brotli.

### App (Node)

1. Baseline `du -sh node_modules`.
2. Duplicates: `npm ls --all | grep -E "@[0-9]" | sort -u | wc -l`, or `pnpm dedupe --check`.
3. Startup cost: `node --cpu-prof ./entrypoint` then open the profile in Chrome DevTools. Barrel-file drag usually dominates — see `/speedup`.
4. Audit `dependencies` vs `devDependencies` placement — runtime deps misplaced in dev break consumers.

---

## Native mode — `/cleanup native`

Pass constrained to native-only swaps. The Node floor is the hard gate.

1. Read Node floor from `.e18e.md` or `package.json` → `engines.node`. Use the real floor, not the aspirational one.
2. Fetch the live `native.json` manifest (see Runtime verification).
3. For every import in the codebase, cross-reference the manifest filtered by the Node floor.
4. Bucket each candidate:
   - Native available at the floor → eligible.
   - Native only above the floor → defer until the floor raises; record as a follow-up.
   - Not covered → skip (use default `/cleanup` or `/levelup`).
5. Pick one, swap, measure, test, commit — same as full-pass step 4-6.

High-leverage native swaps (verify against the live manifest for Node-version cutoffs):

| From | To | Node ≥ |
|---|---|---|
| `node-fetch`, `isomorphic-fetch` | `fetch` | 18 |
| `rimraf` | `fs.rm` | 14.14 |
| `mkdirp` | `fs.mkdir(..., {recursive:true})` | 10.12 |
| `chalk`, `kleur`, `colorette` | `util.styleText` | 20 |
| `uuid` (v4) | `crypto.randomUUID()` | 16.7 |
| `dotenv` | `node --env-file=.env` | 20 |
| `abort-controller` | `AbortController` | 15 |
| `url-parse`, `whatwg-url` | `URL` | 10 |
| `qs` (basic) | `URLSearchParams` | 10 |
| `object-assign` | `Object.assign` | any |
| `strip-ansi` | `util.stripVTControlCharacters` | 16.11 |

→ Full static table: [native-replacements reference](../e18e/reference/native-replacements.md). Verify against the live manifest.

---

## Graph mode — `/cleanup graph <dep>`

Investigate before acting. Useful when the user asks "why is X in my tree?"

1. `npm why <dep>` (or `pnpm why`, `yarn why`, `bun pm ls | grep`) — every path that resolves to this dep.
2. Direct vs transitive:
   - Direct → cleanup is local. Switch to `/cleanup <dep>`.
   - Transitive only → the right target is the direct dep that pulls it in, or an upstream PR on that dep.
3. `du -sh node_modules/<dep>` and approximate transitive weight.
4. Known replacements: look up in the fetched manifests.
5. Report concisely:

```
Package: moment@2.30.1
Pulled in by: my-app (direct dep)
Size: 4.8MB install
Known replacements (from live manifest):
  - day.js (much smaller, similar API)
  - native Intl + Date (no dep, some rewrite)
Next step: /cleanup moment
```

Do not edit anything in graph mode — it's diagnostic only.

---

## When to decline

- Project's Node floor doesn't permit the native replacement.
- Replacement is ESM-only and the project publishes CJS.
- Dep is re-exported (directly or via types) to downstream consumers — that's breaking, not cleanup.
- `.e18e.md` lists the dep as off-limits.
- User has an open migration on that dep already.

Explain the blocker; suggest the alternative if there is one.

## NEVER

- Never batch multiple cleanups. One PR per dep.
- Never use `overrides` / `resolutions` as a first response to a transitive. Upstream first.
- Never skip the measurement step.
- Never replace without running the project's tests.
- Never recommend from the static reference tables without checking the live manifest first — the ecosystem moves.
- Never recommend a native below the Node floor.
- Never claim `"sideEffects": false` without confirming it's actually true.

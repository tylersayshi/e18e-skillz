---
name: audit
description: "Run a comprehensive e18e audit across dependency cleanup, bundle size, hot-path performance, native replacements, modernization, and publish shape. Produces a scored report with P0-P3 severity ratings and a prioritized action list, plus an optional dep-tree investigation. Does not edit files. Use when the user wants a dependency audit, ecosystem-performance check, bundle review, or a starting point for cleanup/speedup/levelup work."
argument-hint: "[area | graph <dep> | empty for full audit]"
user-invocable: true
---

## MANDATORY PREPARATION

Invoke `/e18e` — it contains the Context Gathering Protocol. Run `/e18e teach` first if no context exists. An audit without context produces generic and often wrong recommendations (Node floor, module format, publish target change what counts as an issue).

---

Systematic read-only diagnosis. This skill does not edit anything — it produces a scored report and maps findings to the three fix commands (`/cleanup`, `/speedup`, `/levelup`).

## Modes

| Invocation | Mode | When |
|---|---|---|
| `/audit` | Full audit across 5 dimensions | Starting point on an unfamiliar project |
| `/audit <area>` | Focus on one area | "Audit the auth module", "audit the bundle" |
| `/audit graph <dep>` | Dep-tree investigation | "Why is X in my tree?" |

---

## Runtime verification — manifests

When cross-referencing deps against known-bad lists, fetch the live e18e manifests rather than relying on a static snapshot. WebFetch:

- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/native.json`
- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/preferred.json`
- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/micro-utilities.json`

Fetch once per audit. If WebFetch fails, fall back to the static reference files and note that the findings are from cached data.

---

## Diagnostic Scan

Run checks across 5 dimensions. Score each 0-4.

### 1. Dependency Cleanup

**Check for**:
- Polyfills for built-ins available at the project's Node floor (`object-assign`, `is-buffer`, `es6-promise`, `array.prototype.flat`). Cross-reference live `native.json` + `engines.node`.
- Duplicate implementations (two globbers, two color libs, two deep-equal libs) — `npm ls --all`, `npm why`.
- Unused deps — declared in `package.json` but not imported (`npx depcheck`, `knip`).
- Known-bad deps with replacements — cross-reference live `preferred.json`.
- Transitive bloat — direct dep pulling an outsized subtree.

**Score**: 0=Heavily bloated (multiple polyfills, duplicates, 3+ known-bad deps), 1=Significant, 2=Partial (1-2 targets), 3=Mostly clean, 4=Excellent (no known swaps available).

### 2. Bundle / Install Size

**Check for**:
- Install size via `pkg-size.dev` or `npm pack --dry-run` for libraries; `node_modules` size for apps.
- Bundle size: library publish tarball, or app production bundle.
- Heavy single deps pulling disproportionate weight (visualizer or `du -sh node_modules/*`).
- Shipped-but-unused dep code (bundle visualizer's biggest giveaway).

**Score**: 0=Grossly oversized (≥2x floor), 1=Heavy, 2=Some bloat, 3=Reasonable, 4=Tight.

### 3. Hot-Path Performance

**Check for** (see [speedup reference](../e18e/reference/speedup.md)):
- Generator functions in hot paths (per-request, per-frame, per-item loops).
- Long array-method chains (`.map().filter().reduce()`).
- Barrel files in module-graph entry points.
- Sync I/O in async paths (`readFileSync`, `execSync` in handlers).
- Redundant parse/serialize (`JSON.parse(JSON.stringify(...))`, repeated `JSON.parse` of same string).
- Layout-thrashing patterns in frontend code.

**Score**: 0=Multiple obvious regressions, 1=Major patterns present, 2=A few tells, 3=Mostly clean, 4=No obvious slow patterns.

### 4. Native Replacement Opportunities

**Check for**:
- Every import cross-referenced against live `native.json`, filtered by the project's Node floor.
- URL/querystring packages when `URL`/`URLSearchParams` suffices.
- HTTP clients when `fetch` suffices (≥18).
- Color libs when `util.styleText` suffices (≥20).

**Score**: 0=Many polyfills where native is available, 1=Several, 2=A few, 3=Rare, 4=None.

### 5. Publishing Quality (libraries only)

**Check for**:
- `publint` clean? Failures are always P0 or P1.
- `attw` clean? Type-resolution issues are P1.
- `sideEffects` correct — `false` when truthful; blocks tree-shaking when missing.
- `exports` map covers all consumer entry points.
- `engines.node` reflects reality — not aspirational, not ancient.
- No unnecessary files in tarball (`npm pack --dry-run`).

**Score**: 0=Broken publish, 1=Multiple issues, 2=A few, 3=Minor polish, 4=Clean.

If the project is an application, skip this dimension and divide the total by 4 instead of 5.

---

## Report

### Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Dependency Cleanup | ? | [top finding or "--"] |
| 2 | Bundle / Install Size | ? | |
| 3 | Hot-Path Performance | ? | |
| 4 | Native Replacements | ? | |
| 5 | Publishing Quality | ? | |
| **Total** | | **??/20** | **[Rating band]** |

**Rating bands**: 18-20 Excellent, 14-17 Good, 10-13 Acceptable, 6-9 Poor, 0-5 Critical.

### Top-3 Leverage Wins

The three changes with the highest impact-to-effort ratio *given this project's context*. Specific expected install/bundle-size or benchmark delta for each.

### Executive Summary

- Audit Health Score: **??/20** ([rating band])
- Total findings (P0/P1/P2/P3 counts)
- Top 3-5 issues across all dimensions
- Recommended next steps

### Detailed Findings by Severity

Tag every issue with P0-P3:
- **P0 Blocking**: Broken publish, security advisory, runtime failure.
- **P1 Major**: Substantial size/perf cost, or a cleanup the project's constraints clearly permit.
- **P2 Minor**: Worth doing in the next pass.
- **P3 Polish**: Nice-to-fix, small delta.

For each:
- **[P?] Issue name**
- **Location**: `package.json` / lockfile / `src/path/to/file.ts:line`
- **Category**: Cleanup / Size / Hot-Path / Native / Publish
- **Impact**: Specific cost (bytes, ms, dep count).
- **Recommendation**: Specific, not generic.
- **Suggested command**: one of `/cleanup`, `/speedup`, `/levelup` (optionally with a mode).

### Patterns & Systemic Issues

Recurring problems that indicate systemic gaps vs isolated mistakes:
- "Three different color libraries in the tree — consolidate."
- "17 imports from barrel files in hot paths — introduce deep imports."
- "Every HTTP call uses a different client — standardize on `fetch`."

### Positive Findings

Note what's working well. A side-effect-free `exports` map, a tight Node floor that unlocks natives, an already-deduplicated tree — celebrate these.

### Recommended Actions

List commands in priority order (P0 first). Only use: `/cleanup`, `/speedup`, `/levelup` — and their modes:
- `/cleanup`, `/cleanup <dep>`, `/cleanup size`, `/cleanup native`
- `/speedup`, `/speedup <target>`, `/speedup bench <name>`
- `/levelup`, `/levelup <dep>`, `/levelup modernize`, `/levelup publint`

Example:
```
1. [P0] /levelup publint — publint reports a broken `exports` map; consumers on `moduleResolution: node16` can't find types
2. [P1] /cleanup moment — swap to day.js (-2.3 MB install)
3. [P1] /cleanup native — node-fetch, rimraf, object-assign all available as natives at your Node floor
4. [P2] /speedup src/parser.ts — profiled at 40ms on cold input; likely a chained .map().filter() on line 82
```

After the summary:

> Run these one at a time — one package per PR is the e18e rule. Re-run `/audit` after fixes to see the score move.

---

## Graph mode — `/audit graph <dep>`

Investigate a single dep before acting. Diagnostic only — no edits.

1. `npm why <dep>` (or `pnpm why`, `yarn why`, `bun pm ls | grep`) — every path resolving to this dep.
2. Direct vs transitive:
   - Direct → cleanup is local. Recommend `/cleanup <dep>` or `/levelup <dep>`.
   - Transitive only → target is the direct dep pulling it in, or an upstream PR on that dep (see [contributing reference](../e18e/reference/contributing.md)).
3. Size contribution: `du -sh node_modules/<dep>` and approximate transitive weight (`npm ls <dep> --all --parseable | xargs -I {} du -sh {}`).
4. Known replacements: look up in the live manifests.
5. Report concisely:

```
Package: moment@2.30.1
Pulled in by: my-app (direct dep)
Pulls in: (no runtime deps)
Size: 4.8MB install
Known replacements (from live preferred.json):
  - day.js (similar API, much smaller)
  - native Intl + Date (no dep, some rewrite)
Next step: /levelup moment
```

---

## NEVER

- Report findings without impact numbers (bytes, ms, dep count).
- Recommend a native that doesn't meet the project's Node floor.
- Recommend an ESM-only replacement for a CJS-published library without flagging the migration risk.
- Report issues from reference lists without verifying the import actually exists.
- Use P0 for anything that isn't genuinely blocking.
- Skip the live-manifest fetch on a full audit — static tables drift.

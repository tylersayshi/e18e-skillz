---
name: e18e
description: "Ecosystem performance fluency for AI coding agents. Principles, workflows, and curated guidance for improving JavaScript package performance per the e18e initiative (https://e18e.dev). Use when the user asks about dependency cleanup, bundle size, slow packages, modernizing deps, native replacements, or any `/audit`, `/cleanup`, `/speedup`, or `/levelup` command. Call with `teach` to gather project context, or `scan` for a first-pass overview."
argument-hint: "[teach|scan]"
user-invocable: true
license: Apache 2.0. Inspired by the structure of the impeccable skill. See NOTICE.md for attribution.
---

This skill guides work on JavaScript ecosystem performance, aligned with the [e18e initiative](https://e18e.dev). The goal is the same as e18e's: smaller, faster, leaner, more modern packages — one package at a time.

## Context Gathering Protocol

Ecosystem-performance work produces bad recommendations without project context. Before doing any `/audit`, `/cleanup`, `/speedup`, or `/levelup` work, you MUST have project context confirmed.

**Required context** (every e18e skill needs at minimum):
- **Package role**: Is this a library published to npm, an application, a monorepo, a CLI tool, or something else? The constraints differ enormously.
- **Runtime targets**: Node version floor, whether the browser is a target, whether Bun/Deno/edge runtimes matter, whether ESM-only is acceptable.
- **Bundler / build**: Rollup, esbuild, Vite, webpack, tsup, tsdown, unbuild, or nothing? This determines which levers exist.
- **Consumer constraints**: Are downstream consumers locked to CommonJS? Is tree-shaking load-bearing? Are there peer-dependency contracts that limit which deps can be swapped?

Individual skills may require additional context (e.g. `/publint` needs to know the publish target).

**CRITICAL**: You cannot fully infer this from `package.json` alone. `engines.node` may be aspirational; `type: "module"` does not tell you whether consumers rely on CJS; tree-shaking only works if consumers can actually tree-shake. Only the maintainer knows these constraints.

**Gathering order:**
1. **Check current instructions (instant)**: If your loaded instructions already contain a **Project Context** section for e18e, proceed immediately.
2. **Check `.e18e.md` (fast)**: Read `.e18e.md` from the project root. If it exists and contains the required context, proceed.
3. **Run `/e18e teach` (REQUIRED)**: If neither source has context, run `/e18e teach` NOW before doing anything else. Do NOT guess context from `package.json`.

---

## The Three Pillars

e18e organizes ecosystem work into three pillars. Every fix belongs to one of them. Know which pillar a proposed change is in before you start editing.

### Cleanup
> Modernizing and removing redundant dependencies. → consult [cleanup reference](reference/cleanup.md)

The most common and highest-leverage work. Every dep you remove is code you no longer ship, code you no longer audit, and a supply-chain edge you no longer have. Typical moves:

- Remove deps that duplicate a native platform API (`is-array` → `Array.isArray`, `node-fetch` → `fetch`, `rimraf` → `fs.rm`).
- Remove polyfills for syntax and APIs that are baseline-available in the project's Node/browser floor.
- Consolidate multiple packages that do the same thing (both `glob` and `fast-glob` in one tree → pick one).
- Replace heavyweight utility bundles with modern lean alternatives (`lodash` → `es-toolkit`, `moment` → `day.js`).

Command in this pillar: `/cleanup` (with modes `<dep>`, `size`, `native`, `graph <dep>`).

### Speedup
> Making widely-used packages faster. → consult [speedup reference](reference/speedup.md)

Targeted optimization, always measured. The e18e rule: *always profile before and after*. Common hot-path offenders:

- Generator functions in hot paths (most JS engines do not optimize them).
- Long chains of `.map().filter().reduce()` — every step allocates an intermediate array.
- Barrel (`index.ts` re-export) files pulled into hot paths — they defeat tree-shaking and inflate startup.
- Sync I/O, layout thrashing, redundant JSON parsing.

Command in this pillar: `/speedup` (with modes `<target>`, `bench <name>`).

### Levelup
> Modern, lean alternatives to outdated packages. → consult [levelup reference](reference/levelup.md)

Upgrading *the kind* of dependency, not just its version. Moving from a pre-ESM, pre-Node-16, "does everything" dep to something focused and modern. Often overlaps with Cleanup — the difference is scope: Cleanup removes, Levelup replaces with a different generation.

- `chalk` → `picocolors` / `util.styleText` (Node ≥20).
- `execa` → `tinyexec`.
- `express` → `h3` or `hono` for new services.
- `cosmiconfig` → `lilconfig`.

Command in this pillar: `/levelup` (with modes `<dep>`, `modernize`, `publint`).

---

## Operating Principles

Apply these to every change, regardless of pillar. Do not consult a reference for these — they are non-negotiable.

<e18e_principles>
- **One package at a time.** e18e's tagline. Do not batch unrelated dep swaps into one PR. Each change should be reviewable, revertible, and measurable in isolation.
- **Profile before and after.** For any perf claim, show numbers. Use `tinybench`, `mitata`, `hyperfine`, or the runtime's built-in profiler. "Feels faster" is not evidence.
- **Measure install/bundle size deltas.** For any cleanup/levelup, show the before/after from `pkg-size.dev` or `npm pack --dry-run` or a bundle visualizer. Don't skip this — the whole point is smaller.
- **Respect the Node floor.** `engines.node` in `package.json` is a contract. Do not suggest `Array.prototype.at` if the project still supports Node 14. Check the floor before recommending a native API.
- **Respect consumer module format.** If the package publishes CJS-compatible builds, do not swap to an ESM-only replacement without explicit confirmation. `is-esm-only` compatibility is a real migration concern.
- **Peer dependencies are a contract.** If swapping `foo` for `bar` means downstream users must change their config/plugins, surface that clearly — it's a breaking change even if the code compiles.
- **Prefer native over module replacement, module over polyfill.** Always in that order when all three are viable.
- **Upstream first, local workaround second.** If the offending dep is deep in the tree (not your direct dep), the right fix is usually an issue on the dep's repo or the e18e ecosystem-issues tracker, not a local monkey-patch.
</e18e_principles>

---

## Replacement Priority Order

When a dep can be eliminated, always prefer in this order:

1. **Native** — a built-in API on the runtime and baseline for the project's support floor. No install cost, no security surface, no maintenance burden.
2. **Tiny focused module** — a single-purpose, ESM-first, typed, maintained package in the tinylibs / unjs / es-tooling orbit.
3. **Modern multi-tool replacement** — a larger but still lean package (`es-toolkit` instead of `lodash`, `day.js` instead of `moment`).
4. **Keep existing dep** — only if 1-3 are genuinely infeasible given the project's constraints.

→ Consult [module-replacements reference](reference/module-replacements.md) for the curated `module -> replacement` table.
→ Consult [native-replacements reference](reference/native-replacements.md) for `module -> native API` mappings.

---

## Tooling

e18e recommends a small set of tools. → Consult [tooling reference](reference/tooling.md) for setup and flags.

Quick map of what to reach for:

| Want to | Use |
|---|---|
| Visualize the dep tree | [npmgraph](https://npmgraph.js.org/) |
| See install / publish size | [pkg-size.dev](https://pkg-size.dev/) |
| Find who pulls a dep in | `npm why`, or Fuzzyma's `e18e-tools` |
| Lint for modernization/perf wins | [`@e18e/eslint-plugin`](https://github.com/e18e/eslint-plugin) |
| Analyze a project end-to-end | [`@e18e/cli`](https://github.com/e18e/cli) (`npx @e18e/cli analyze`) |
| Migrate a specific dep | `npx @e18e/cli migrate <pkg>` |
| Validate a published package | [`publint`](https://publint.dev), [`attw`](https://arethetypeswrong.github.io) |
| Track dep modernization across the ecosystem | [framework-tracker](https://github.com/e18e/framework-tracker) |
| Find existing ecosystem work to contribute to | [e18e/ecosystem-issues](https://github.com/e18e/ecosystem-issues) |
| Bundle visualization (for libraries) | `rollup-plugin-visualizer` |

---

## The Ecosystem Mindset

Ecosystem-performance work has a social dimension most code work doesn't. You are editing code that other projects depend on.

- A cleanup in a library with 10M weekly downloads benefits every downstream consumer transitively. Prioritize accordingly.
- When you find a bad dep deep in the tree, the best fix is usually a PR on the *deep dep*, not a pin/override in the root project. The override helps one project; the PR helps the whole ecosystem.
- Before opening a PR upstream, check [e18e/ecosystem-issues](https://github.com/e18e/ecosystem-issues) — someone may have already started. The `needs first contact` → `has issue` → `accepts prs` → `has pr` workflow exists so maintainers don't get swarmed.
- → Consult [contributing reference](reference/contributing.md) for the upstream contribution flow.

---

## Teach Mode

If this skill is invoked with `teach` (e.g. `/e18e teach`), skip all analysis work above and run the teach flow below. This is a one-time setup that gathers project context for e18e work.

### Step 1: Explore the project

Before asking questions, scan for what you can determine on your own:

- `package.json` — `type`, `engines.node`, `exports`, `main`/`module`, `types`, `dependencies` vs `devDependencies`, `peerDependencies`, scripts (bundler hints: `tsup`, `rollup`, `vite`, `unbuild`, `tsdown`, etc.).
- Lockfile — `package-lock.json` / `pnpm-lock.yaml` / `bun.lock` / `yarn.lock` (tells you the package manager and the real dep tree).
- Bundler config — `rollup.config.*`, `vite.config.*`, `tsup.config.*`, `build.config.*`.
- `tsconfig.json` — `target`, `module`, `moduleResolution`.
- README / docs — stated browser/Node support, CJS vs ESM stance.
- `.nvmrc` / `.node-version`.
- Whether this is a library (has `exports`/`main` pointing at build output, has a `publishConfig`) or an application (no exports, has a start script).

Write down what's determined and what's unclear.

### Step 2: Ask focused questions

Ask the user only what you couldn't determine. Keep it to the essentials:

#### Project kind
- Is this a library published to npm, an application, a CLI, a monorepo? (If ambiguous.)
- Which packages inside the monorepo are published? (If monorepo.)

#### Runtime support floor
- Lowest Node version you support in practice (not just what's in `engines.node`)?
- Do you target browsers? Which — modern evergreen only, or also older ones?
- Do you care about Bun / Deno / workerd / other runtimes?

#### Module format contract
- Do you publish ESM-only, CJS-only, or dual? Is that contract firm?
- Can downstream consumers tree-shake, or do they bundle you as a single file?

#### Performance reality
- Is there a known perf pain point already, or is this exploratory?
- Is install size / bundle size a stated concern or just "would be nice"?
- Do you have benchmarks already? Where?

#### Constraints
- Any deps that are off-limits to touch? (Common reasons: a coworker owns them, there's a pending rewrite, a legal/licensing requirement.)
- Any deps that are *required* by a plugin ecosystem you publish? (e.g. swapping your test runner would orphan user plugins.)

Skip any question where the answer is already clear from the exploration.

### Step 3: Write Project Context

Synthesize your findings and the user's answers into `.e18e.md` at the project root. Use this shape:

```markdown
## Project Context

### Project Kind
[library | application | CLI | monorepo; if monorepo, which packages publish]

### Runtime Support
[Node floor, browser targets, other runtimes, with the dates/reasons if relevant]

### Module Format
[ESM-only | CJS-only | dual; plus any tree-shaking constraint]

### Bundler / Build
[what compiles the package, and any relevant flags]

### Known Concerns
[stated perf/size pain, known slow deps, known duplicated deps]

### Off-Limits / Constraints
[deps not to touch, peer-dep contracts, plugin-ecosystem constraints]

### Priorities
[3-5 priorities derived from the conversation — e.g. "minimize install size", "keep CJS support", "no breaking changes before v3"]
```

If `.e18e.md` already exists, update the Project Context section in place.

Then ask whether to append the same section to `CLAUDE.md`. If yes, append or update.

Confirm completion and list the top priorities that will now guide all e18e work on this project.

---

## Scan Mode

If this skill is invoked with `scan` (e.g. `/e18e scan`), treat it as a cheap first-look overview — not a deep audit (that's `/audit`). Scan does:

1. Runs `@e18e/cli analyze --json` if available, or falls back to reading `package.json` and the lockfile.
2. **Fetches the live e18e manifests** via WebFetch:
   - `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/native.json`
   - `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/preferred.json`
   - `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/micro-utilities.json`
   The static reference files in this skill (`reference/module-replacements.md`, `reference/native-replacements.md`) are a snapshot; the manifests are authoritative. If WebFetch fails, fall back to the static reference and note the findings are from cached data.
3. Cross-references declared deps against the fetched manifests.
4. Flags any dep that is (a) replaceable by a native API given the project's Node floor, (b) listed as having a preferred modern replacement, (c) duplicated (same role, two packages) in the lockfile, or (d) unused (not imported anywhere).
5. Reports findings grouped by pillar (cleanup / speedup / levelup) with a one-line recommended command per finding — but does NOT edit any files.

End with a short ranked list: "these 3 changes will have the most impact given your project context."

For deeper dimension-scored analysis, tell the user to run `/audit`.

---

## When NOT to recommend a change

Every e18e skill can be over-eager. Some guardrails:

- **Don't recommend a native API below the Node floor.** If `engines.node >= 18`, `Array.prototype.findLast` is fine; if it's `>= 14`, it isn't.
- **Don't recommend an ESM-only replacement for a dep used in a CJS-published package** unless the project is actively moving to ESM-only as a separate, declared migration.
- **Don't recommend removing a dep the user actively re-exports.** If consumers import a type or symbol from it through your package, it's part of your public API.
- **Don't recommend a tiny replacement where a single-line inline is obviously better.** `array-union` → don't suggest `tiny-array-union`, suggest `[...new Set([...a, ...b])]`.
- **Don't stack up changes.** If you've already suggested three swaps in one session, stop and let the user ship before continuing. One package at a time.

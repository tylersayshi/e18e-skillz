# e18e-skill

Ecosystem-performance fluency for AI coding agents. 1 skill, 4 commands, runtime-verified against the live [e18e module-replacements manifest](https://github.com/es-tooling/module-replacements).

## Why

AI coding agents tend to default to whatever was common in their training data: `axios` over `fetch`, `moment` over `day.js`, `lodash` over native, polyfills for APIs the runtime now has. The [e18e initiative](https://e18e.dev) coordinates community work to fix this across the JavaScript ecosystem — one package at a time — through three pillars: **cleanup**, **speedup**, **levelup**.

This project gives AI harnesses the same vocabulary and the same rules: measure before and after, respect the Node floor and module-format contract, upstream first, one package per PR.

## What's Included

### The Skill: `/e18e`

A context-first skill that gathers project info (Node floor, module format, bundler, consumer constraints) into `.e18e.md`. Every command reads that context before doing anything else.

Reference files (`source/skills/e18e/reference/`):

| Reference | Covers |
|-----------|--------|
| [cleanup](source/skills/e18e/reference/cleanup.md) | Remove redundant deps; discover/classify/measure/ship |
| [speedup](source/skills/e18e/reference/speedup.md) | Profile hot paths; the rule: always measure |
| [levelup](source/skills/e18e/reference/levelup.md) | Replace old-generation deps with ESM-first, typed, tree-shakeable successors |
| [module-replacements](source/skills/e18e/reference/module-replacements.md) | Curated `original → replacement` table (static snapshot) |
| [native-replacements](source/skills/e18e/reference/native-replacements.md) | `module → native API` mappings gated by Node floor (static snapshot) |
| [tooling](source/skills/e18e/reference/tooling.md) | `@e18e/cli`, `@e18e/eslint-plugin`, publint, attw, tinybench, and the rest |
| [contributing](source/skills/e18e/reference/contributing.md) | Upstream contribution workflow via `e18e/ecosystem-issues` |

### 4 Commands (one per pillar, plus audit)

| Command | Modes | What it does |
|---------|-------|--------------|
| `/audit` | `/audit`, `/audit <area>`, `/audit graph <dep>` | Scored report across 5 dimensions, P0-P3 findings, no edits |
| `/cleanup` | `/cleanup`, `/cleanup <dep>`, `/cleanup size`, `/cleanup native`, `/cleanup graph <dep>` | Remove, swap, or inline deps; reduce tarball/bundle/install size |
| `/speedup` | `/speedup`, `/speedup <target>`, `/speedup bench <name>` | Profile + fix runtime perf; scaffold benchmarks; always measured |
| `/levelup` | `/levelup`, `/levelup <dep>`, `/levelup modernize`, `/levelup publint` | Modernize deps; apply ESLint modernization; validate publish shape |

#### Typical flows

```
/e18e teach                       # one-time: gather project context
/e18e scan                        # cheap first-look overview
/audit                            # scored report
/cleanup                          # start removing bloat (one dep at a time)
/cleanup moment                   # targeted swap of one dep
/cleanup native                   # sweep for polyfills at the Node floor
/speedup src/parser.ts            # profile + fix a known hot path
/levelup publint                  # before a library release
```

## Runtime manifest verification

Static reference tables drift as the ecosystem moves. For recommendations that involve a specific dep swap, the skills use WebFetch against the live e18e manifests before recommending:

- `manifests/native.json` — module → native API
- `manifests/preferred.json` — module → preferred module
- `manifests/micro-utilities.json` — module → inline expression

If WebFetch is unavailable the skills fall back to the static reference snapshot and tell the user the recommendation is from cached data. This keeps day-to-day use fast while ensuring recommendations for the volatile parts stay current.

## Principles

Every command inherits the same non-negotiables:

- **One package at a time.** Each change is a reviewable, revertible PR.
- **Profile before and after.** No unmeasured performance claims.
- **Measure install/bundle size deltas** for any cleanup or levelup.
- **Respect the Node floor and module-format contract.** `engines.node` and `exports` shape are contracts.
- **Upstream first, local workaround second.** `overrides`/`resolutions` are a last resort.
- **Prefer native > focused module > multi-tool replacement > keep.** In that order when all are viable.

## Installation

**Claude Code (project-specific):**
```bash
cp -r .claude/skills/* your-project/.claude/skills/
```

**Claude Code (global):**
```bash
cp -r .claude/skills/* ~/.claude/skills/
```

Run `/e18e teach` once in a project to populate `.e18e.md` with your project's runtime and publish-shape context. Every other command uses it.

## Build

Skills are authored in `source/skills/` and copied to `.claude/skills/` by:

```bash
node scripts/build.mjs
```

No templating, no preprocessing — `.claude/skills/` is a mirror of `source/skills/` after build.

## Contributing

Patterns, replacements, and tooling move fast in this ecosystem. PRs that update the static reference files against the current state of the upstream e18e manifests are welcome. One change per PR.

## License

Apache 2.0. See [LICENSE](LICENSE).

Structure and workflow pattern adapted from [impeccable](https://github.com/pbakaus/impeccable). Domain content adapted from the [e18e initiative](https://e18e.dev) and associated repositories. See [NOTICE.md](NOTICE.md) for attribution. Not officially affiliated with e18e.

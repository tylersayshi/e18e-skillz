---
name: levelup
description: "Move a project to the modern generation of dependencies and publishing practices. Covers the full e18e levelup pillar: replacing outdated deps with ESM-first, typed, tree-shakeable successors; applying ESLint modernization rules from @e18e/eslint-plugin; validating a library's publish shape with publint and are-the-types-wrong (attw). Always verified against the live e18e module-replacements manifest. Use when the user wants to modernize dependencies, migrate to ESM, refresh code style, validate publish shape before release, or replace unmaintained packages."
argument-hint: "[dep-name | modernize | publint | empty for full pass]"
user-invocable: true
---

## MANDATORY PREPARATION

Invoke `/e18e` — it contains the Context Gathering Protocol. Run `/e18e teach` first if no context exists. Levelup work changes API shapes and publish surfaces — without project constraints, it will break consumers.

---

A levelup is a *generation change*, not a version bump. `lodash@4 → lodash@5` is a bump. `lodash → es-toolkit` is a levelup. Same goes for the project's *own* publish shape: ESM-first, typed in-package, tree-shakeable, focused.

## Modes

| Invocation | Mode | When |
|---|---|---|
| `/levelup` | Full pass | Scan deps + publish shape together |
| `/levelup <dep>` | Targeted dep swap | User names a specific dep |
| `/levelup modernize` | Code modernization | Apply `@e18e/eslint-plugin` modernization rules |
| `/levelup publint` | Publish-shape validation | Library author preparing a release |

---

## Runtime verification — manifests

**Before recommending a specific replacement**, fetch the live e18e manifests. The static reference tables are a baseline; the manifests are authoritative.

WebFetch:

- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/preferred.json` — module → modern alternative
- `https://raw.githubusercontent.com/es-tooling/module-replacements/main/manifests/native.json` — module → native API

Fetch once per session when the user first hits a case that needs a recommendation. If WebFetch fails, fall back to the static reference and tell the user the recommendation is from cached data.

---

## What counts as a levelup

A swap qualifies when the replacement is at least one of:

- ESM-first where the original was CJS with ESM bolted on.
- Typed in-package where the original needed `@types/*`.
- Tree-shakeable (named exports, no side effects).
- Modern-runtime-first vs written for IE11.
- Focused (does one thing) vs kitchen-sink.
- Actively maintained vs quiet for 2+ years.

A version bump alone is not a levelup.

---

## Full Pass Workflow

### 1. Targeting

Scan for candidates:

- Any dep with a known modern alternative (cross-reference live `preferred.json`).
- Any CJS-only dep when the project is ESM-first.
- Any dep needing a separate `@types/*` package.
- Any dep whose last npm publish is >18 months ago when a maintained alternative exists.
- Any "kitchen sink" where only 1-3 functions are used (often inline-able — see `/cleanup`).

Pick ONE. Do not batch.

### 2. Three compatibility gates

All must pass:

1. **Node floor**: replacement's `engines.node` ≤ project's Node floor.
2. **Module format**: if the project still publishes/consumes CJS, the replacement must have a `require`-compatible entry — unless the project has a separately declared ESM-only migration in flight.
3. **Types**: replacement ships its own types in-package.

Any failure → say so and stop. Don't propose with a caveat — the caveat *is* the reason to decline.

### 3. Scope the migration

Read the replacement's README. Enumerate:

- Every call site of the original.
- Equivalent call in the replacement (or that there isn't one).
- Config changes (e.g. moving from `axios.defaults` to per-call options).
- Behavior changes (e.g. `tinyexec` doesn't shell-parse by default; `dequal` differs from `deep-equal` on edge cases).

Tell the user the scope *before* editing: "20 call sites, 3 need non-trivial rewrite because they use X."

### 4. Execute

```bash
npx @e18e/cli migrate <pkg>     # if supported
```

Or manual:
1. Install new dep, remove old.
2. Update imports.
3. Adjust config / behavior differences.
4. Run tests.
5. Spot-check produced artifacts (built bundle, published types) for regressions.

### 5. Measure

- Install size delta (`pkg-size.dev`).
- Type correctness (`attw --pack` if a library) — see publint mode below.
- `publint` clean (if a library).
- Test suite pass.

### 6. Commit

One PR title: "Replace `<old>` with `<new>`." Don't combine with unrelated cleanups.

---

## Targeted mode — `/levelup <dep>`

User named a specific dep. Run steps 2-6 above on that dep only.

If no replacement is specified (`/levelup moment`), look up in the live `preferred.json` manifest and pick the recommended alternative. Tell the user which one and why before editing.

If a replacement is specified (`/levelup moment with day.js`), use it but still validate the three gates.

### Common levelup swaps

Verify against the live manifest. Static snapshot:

| Old | Levelup target | Win |
|---|---|---|
| `lodash` | `es-toolkit` | ESM, typed, tree-shakeable; often -80% shipped bytes |
| `moment` | `day.js` or native `Intl` | Active maintenance; smaller |
| `chalk` | `picocolors` or `util.styleText` (≥20) | Tiny or zero dep |
| `execa` | `tinyexec` | ~10x smaller |
| `cosmiconfig` | `lilconfig` | Faster, smaller, compatible |
| `glob`/`fast-glob` | `tinyglobby` | Smaller, actively maintained |
| `axios`/`node-fetch` | `fetch` or `ofetch` | Native or tiny |
| `express` | `h3` or `hono` | Runtime-agnostic, tiny |
| `jiti@<2` | `jiti@2+` | Substantial rewrite, much faster |
| `jsonwebtoken` | `jose` | Web-standard primitives |
| `uuid` | `crypto.randomUUID()` or `nanoid` | Native or smaller |
| `dotenv` | `node --env-file=.env` (≥20) | Native |

→ Full static table: [levelup reference](../e18e/reference/levelup.md). Verify against the live manifest.

---

## Modernize mode — `/levelup modernize`

Apply syntax/API modernization from `@e18e/eslint-plugin`. No dep changes — code changes only.

### 1. Install the plugin

```bash
npm install --save-dev @e18e/eslint-plugin
```

```js
// eslint.config.js
import e18e from "@e18e/eslint-plugin";
export default [
  e18e.configs.modernization,
  e18e.configs["performance-improvements"],
];
```

If the project uses Oxlint or Biome, use their equivalents (Biome `style/*`, Oxlint `oxc/*`).

### 2. Run with auto-fix

```bash
npx eslint . --fix
# or
npx oxlint .
# or
npx biome check --write .
```

### 3. Hand-review the auto-fixes

Auto-fixes are not always semantics-preserving. Diff and confirm:

- `??` vs `||` is a semantic change. `prefer-nullish-coalescing` is correct only when `null`/`undefined` is distinct from `false`/`0`/`""` at this call site.
- `prefer-array-some` changes return type from element to boolean.
- `prefer-array-at` on negative indices: verify length checks.
- `prefer-object-has-own` requires Node ≥16.9.

### 4. Run the full test suite

Modernization should not change observable behavior. If a test breaks, the most common cause is `??`/`||` substitution where the old code intentionally caught `0` or `""`.

### 5. Commit

One commit per rule family or logical group. Don't fold modernization into a dep-change PR — it muddies review.

### Rules worth knowing

From `modernization` config:
- `prefer-array-at` — `arr[arr.length - 1]` → `arr.at(-1)` (Node ≥16.6)
- `prefer-includes` — `arr.indexOf(x) !== -1` → `arr.includes(x)`
- `prefer-nullish-coalescing` — `x || default` → `x ?? default` when correct
- `prefer-object-has-own` — `hasOwnProperty.call(o, k)` → `Object.hasOwn(o, k)` (Node ≥16.9)
- `prefer-array-is-array` — manual checks → `Array.isArray(x)`
- `prefer-date-now` — `new Date().getTime()` → `Date.now()`
- `prefer-modern-promise-methods` — polyfill-style → native `Promise.any`/`allSettled`

From `performance-improvements` config:
- `prefer-array-some` — `arr.filter(x).length > 0` → `arr.some(x)` (stops on first hit)
- `prefer-regex-test` — `s.match(re)` for booleans → `re.test(s)`
- `prefer-timer-args` — closures into `setTimeout` → use the args form

---

## Publint mode — `/levelup publint`

Validate a library's publish shape. Library-only — if the project is an application, decline and suggest `/cleanup size` instead.

Consumer breakage from a bad publish shape is the most common avoidable bug class. The tools below catch it before release.

### 1. Run publint

```bash
npx publint
```

Treat every error as a release blocker. Common findings:

- **`main` points to a file that doesn't exist** → build output missing from tarball.
- **`exports` condition order wrong** → `"types"` must come first within each entry.
- **Missing `types` condition in `exports`** → TypeScript on `node16`/`bundler` resolution can't find types.
- **File is ESM but imported as CJS** / **vice versa** → format mismatch.

### 2. Run attw

```bash
npx attw --pack
```

Reports a matrix of seven resolution modes × your declared entry points. Red cells are bugs.

Common findings:
- **Types not resolved under bundler** — missing `"types"` condition order in `exports`.
- **Masquerading as CJS / ESM** — declared format doesn't match file contents.
- **No `exports`** — works but narrows compatibility; conscious decision.

### 3. Verify tarball contents

```bash
npm pack --dry-run
# or
npm pack && tar -tzf *.tgz | sort
```

Should contain: `package.json`, built artifacts, README, LICENSE, types.

Should NOT contain: `src/` (unless intentional), `test/`/`tests/`/`__tests__/`, `.github/`/`.vscode/`, `node_modules/`, source maps (unless intentional), `*.test.*`, `*.spec.*`.

Fix with `files` in `package.json` (allowlist; preferred over `.npmignore`).

### 4. Verify `sideEffects`

If `"sideEffects": false` is claimed, verify it's true. Test: bundle a consumer that imports a single named export and confirm unused code is dropped.

If you import CSS, register on import, or anything that *runs* at import: `sideEffects: false` is wrong. Downgrade to an array of exceptions (`["*.css", "registration.js"]`) or remove the claim.

### 5. Verify `engines.node`

Match it to the actual minimum Node your code requires:
- `fetch` global → ≥18
- `crypto.randomUUID` → ≥16.7
- `structuredClone` → ≥17
- `util.styleText` → ≥20
- Top-level await → ≥14.8 + ESM

Lower lies; higher excludes consumers who would have worked.

### 6. Verify `exports` coverage

For each entry point consumers import, there should be a matching `exports` key. A subpath consumer reaches that's missing from `exports` will fail. Add explicit subpaths or use a pattern (`"./utils/*": "./dist/utils/*.mjs"`).

### 7. Wire into CI

```yaml
- run: npx publint
- run: npx attw --pack
```

So they don't regress.

---

## NEVER

- Never recommend a levelup without verifying Node floor, module format, and types compatibility.
- Never batch multiple levelups in one PR.
- Never recommend an ESM-only replacement for a dual-publish library without flagging the breaking implication.
- Never skip the measurement.
- Never apply `prefer-nullish-coalescing` auto-fix without hand-verifying — semantic change is real.
- Never publish a library without running `publint` and `attw --pack`.
- Never bump `engines.node` upward without a major version bump.
- Never change `exports` map shape without a major version bump — breaking even when the code is identical.
- Never recommend from the static tables without checking the live manifest first.

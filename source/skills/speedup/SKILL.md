---
name: speedup
description: "Identify and fix runtime-performance issues in JavaScript packages. Covers the full e18e speedup pillar: profiling hot paths, fixing known-bad patterns (generators in hot loops, array-chain allocations, barrel-file startup drag, sync I/O in async handlers, redundant JSON parse/serialize), and scaffolding benchmarks to validate every change. Use when the user mentions slow package, hot path, perf regression, runtime profiling, generator/barrel/array-chain performance, or needs to set up a benchmark."
argument-hint: "[target (file, function, scenario) | bench <name> | empty for full pass]"
user-invocable: true
---

## MANDATORY PREPARATION

Invoke `/e18e` — it contains the Context Gathering Protocol and the speedup principles. Run `/e18e teach` first if no context exists.

---

**The rule: profile before and after, always.** Every speedup claim needs a before/after number. "Feels faster" is not evidence. If you can't produce measurable numbers, don't make the change.

## Modes

| Invocation | Mode | When |
|---|---|---|
| `/speedup` | Full workflow | Known-hot path, exploratory or guided |
| `/speedup <target>` | Targeted | User names a specific file/function/scenario |
| `/speedup bench <name>` | Bench-only | Scaffold or run a benchmark, no code changes |

---

## Workflow

### 1. Confirm there is a hot path to speed up

- User named a target → go to step 2.
- "General speedup" with no target → refuse without a profile. Suggest running `/audit` first, or ask what's slow specifically:
  - Slow startup? → measure with `hyperfine`.
  - Slow per-request? → `node --cpu-prof` on a representative load.
  - Slow test suite? → separate problem; test-runner config.
  - Slow build? → separate problem; bundler-specific work.

Premature optimization without a profile is off-limits. Don't edit a hot path you can't prove is hot.

### 2. Locate the hot path

- Startup: `node --cpu-prof ./entrypoint args...` → produces `CPU.<ts>.cpuprofile` → open in Chrome DevTools → Performance → Load profile.
- Per-request: instrument the handler; record a profile under representative load.
- Known-hot function: skip profiling, write the benchmark (next step).

Confirm which file/function/loop. Name it.

### 3. Write or find the benchmark FIRST

Before editing, the benchmark exists. It's the measurement contract.

Pick the harness:

- **`tinybench`** — default. Tiny, dep-light, good for library micro-benchmarks.
- **`mitata`** — higher-precision; prefer for tight loops or sub-microsecond ops.
- **`hyperfine`** — whole-process benchmarking. For CLI startup, build times.
- **`vitest bench`** — if the project already uses vitest.

#### tinybench scaffold

```js
// bench/hot-path.bench.js
import { Bench } from "tinybench";
import { current } from "../src/hot-path.js";

const input = /* representative, deterministic input */;

const bench = new Bench({ time: 1000, warmupTime: 200 });
bench.add("current", () => current(input));
// When comparing: bench.add("candidate", () => candidate(input));

await bench.run();
console.table(bench.table());
```

#### mitata scaffold

```js
import { bench, run } from "mitata";
bench("current", () => current(input));
await run();
```

#### hyperfine

```bash
hyperfine --warmup 3 --runs 20 './bin/my-cli --help'
hyperfine --warmup 3 --runs 20 \
  'node -e "require(\"./dist/old\")"' \
  'node -e "require(\"./dist/new\")"'
```

Commit the bench (or at least save it). The delta must be reproducible later.

### 4. Run baseline

Copy-paste the output. This is the "before" for the PR.

### 5. Make ONE change

Pick exactly one pattern from the catalog below. One change per benchmark cycle.

### 6. Re-run the benchmark

Record the new numbers. Compute the delta.

### 7. Decide

| Delta | Action |
|---|---|
| ≥10% faster, no behavior change | Keep. Go to 8. |
| 5–10% faster | Borderline. Re-run on a second machine or fresh session. Accept only if also clearer/not worse. |
| < 5% faster | Noise. Revert. |
| Slower | Revert. Intuition was wrong. Don't rationalize. |

### 8. Validate correctness

Run the **full** project test suite, not just the file you touched. A 30% speedup that changes a return value by one element is not a speedup.

### 9. Commit and report

One commit, one speedup. PR body must include:

- What was slow, with baseline numbers.
- What was changed (one sentence).
- New numbers.
- Path to the benchmark, Node/Bun/Deno version it was run on, CPU/OS (`uname -a` suffices).

Then stop. Offer to profile again, do not chain.

---

## The hot-path pattern catalog

Known-bad patterns with standard fixes. Expected order-of-magnitude is rough — always re-measure, numbers vary by engine version and input shape.

### Generator functions in hot loops

**Detect**: `function*` or `yield` inside a path called millions of times per second.

**Why**: Most JS engines do not aggressively optimize generator bodies. Call overhead dominates tight loops.

**Fix**: pre-built array (if small, finite), manual iterator (`{ next() {...} }`), or fuse the consumer loop with the producer.

**Typical win**: 2-10x on the hot path. If less, the generator wasn't the bottleneck.

### Long array-method chains

**Detect**: `arr.map(...).filter(...).reduce(...)` in hot paths. Two+ intermediate collections allocated.

**Why**: Each step walks the full array and allocates an intermediate. N steps = N allocations + N walks.

**Fix**: single `for...of` computing the final value in one pass.

```js
// Before
const result = arr.map(f).filter(g).reduce(h, init);

// After
let acc = init;
for (const x of arr) {
  const m = f(x);
  if (g(m)) acc = h(acc, m);
}
```

**Typical win**: 30-70% faster + major GC pressure reduction on wide inputs.

### Barrel files in hot imports

**Detect**: CLI startup, serverless cold-start, or render function imports from a root `index.ts` that re-exports `*`.

**Why**: pulls the whole subtree at module evaluation time; tree-shaking often defeated by bundler conservatism or side-effectful barrels.

**Fix**: import from deep paths (`import { x } from "pkg/sub/thing"`). If the package's `exports` map doesn't expose the deep path, that's an upstream fix — the package itself needs to be slimmed.

**Detect with**: ESLint `eslint-plugin-barrel-files`, Biome `noBarrelFile`, Oxlint `oxc/no-barrel-file`.

**Typical win**: 100ms+ off CLI startup, similar off serverless cold-start.

### Sync I/O in async paths

**Detect**: `readFileSync`, `writeFileSync`, `execSync`, synchronous `sharp`/`image-size` inside a request handler or per-request middleware.

**Why**: stalls the Node event loop — every other in-flight request waits.

**Fix**: async counterpart (`fs.promises.readFile`, `async exec`). If sync is truly unavoidable, move to a worker thread.

**Typical win**: restores concurrency. Individual request time may not drop, but p95/p99 under load improves dramatically.

### Redundant parse / serialize

**Detect**:
- `JSON.parse(JSON.stringify(x))` as a deep clone.
- `JSON.parse(someString)` inside a loop where `someString` doesn't change.
- `JSON.stringify` of a large object repeatedly for logging.

**Fix**:
- Deep clone → `structuredClone(x)` (Node ≥17 global).
- Loop parse → hoist; parse once.
- Logging → defer stringification until the log level is confirmed (`logger.debug(() => JSON.stringify(x))`).

**Typical win**: proportional to input size; often 10x+ on large objects.

### Regex match where test suffices

**Detect**: `if (s.match(re))` or `if (s.match(re) !== null)` — only a boolean is needed.

**Fix**: `if (re.test(s))`. Often auto-fixed by `@e18e/eslint-plugin`'s `prefer-regex-test`.

### Layout thrashing (frontend)

**Detect**: interleaved DOM reads (`offsetHeight`, `getBoundingClientRect`) and writes (`el.style.*`) in a loop.

**Fix**: batch reads into variables, then batch writes. Or align writes with `requestAnimationFrame`.

**Typical win**: eliminates forced synchronous reflows — sub-16ms frames instead of 40+ms.

### Redundant string concatenation

**Detect**: building up a large string in a loop with `+=`.

**Fix**: push parts to an array, `arr.join("")` at the end. Or use a `Writable` / `Response` stream for very large outputs.

**Typical win**: meaningful only for very large strings; often not worth rewriting.

---

## Bench-only mode — `/speedup bench <name>`

Scaffold or run a benchmark without code changes. Useful when the user wants numbers for a PR they're writing by hand.

1. Pick the harness (tinybench / mitata / hyperfine).
2. Create `bench/<name>.bench.js` with the scaffold above.
3. Populate with the user's scenario.
4. Run, print the table, stop.

### Regression guardrails for libraries

Optional but useful. Commit benchmarks and run them in CI:

- `vitest bench` — if already on vitest.
- GitHub Action with hyperfine — posts before/after comments on PRs.
- [`codspeed`](https://codspeed.io/) — continuous benchmarking service that gates PRs on perf regressions.

---

## Interpreting results

- **Variance > ~5% across runs**: the bench is noisy. Increase `time`, eliminate background processes (no video calls, no builds running), or switch harnesses.
- **Delta transfers across machines**: sign of a real win.
- **Delta only on one machine**: treat with suspicion — could be JIT tier-up on that run, thermal throttling, or noise.
- **Different Node versions**: don't compare across them. Pick one.

---

## NEVER

- Never edit a hot path without a benchmark.
- Never accept a speedup under ~5% without reproducing on a second machine or fresh session.
- Never optimize a function you can't prove is hot via a profile.
- Never bundle speedup with cleanup or levelup work in the same PR.
- Never trust "feels faster."
- Never bench on a busy machine.
- Never use non-deterministic inputs in a benchmark.

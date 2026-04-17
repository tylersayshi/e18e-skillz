# Speedup Reference

> Source: https://e18e.dev/guide/speedup.html plus community patterns.

Speedup is optimization, and optimization without measurement is vandalism. This reference is a map of where the wins tend to be and the tools for finding them — not a license to rewrite hot paths on vibes.

## The Rule

**Profile before and after.** Every claim in a speedup PR needs a number next to it.

- `tinybench` — small, dependency-light, good for library micro-benchmarks.
- `mitata` — higher-precision, newer; preferred by e18e contributors for tight loops.
- `hyperfine` — CLI benchmarking; perfect for measuring startup time of tools.
- Node's `--prof`, `--cpu-prof`, and `node --inspect` + Chrome DevTools Profiler — for real-call-tree profiling.
- Bun's built-in `bun --bench` and `bun build --analyze`.
- For libraries shipping to the browser, use DevTools' Performance panel on a representative real app, not a synthetic benchmark.

## Common hot-path offenders

### Generators in hot paths

Most JavaScript engines do not aggressively optimize generator functions. A generator called millions of times per second will underperform a plain iterator or a pre-built array by a wide margin.

- **Fix**: replace `function* () { yield ... }` with either a plain array (if the result set is small and finite) or an iterator implemented as `{ next() { ... } }`.
- **When OK**: user-facing code paths that run once per request. Don't refactor every generator; refactor the ones a profile flags.

### Array method chains

`arr.map(a).filter(b).reduce(c)` allocates two intermediate arrays and walks the data three times. In a hot path that's a real cost.

- **Fix**: rewrite as a single `for` or `for...of` loop that computes the final value in one pass.
- **Alternative**: use an iterator library that evaluates lazily (`iter-tools`, `itertools-ts`). Only worth it if the chain is long AND hot.
- **When OK**: non-hot code. Clarity wins in 99% of places.

### Barrel files

`index.ts` that does `export * from "./a"; export * from "./b"; ...` forces every consumer to pull the graph rooted at `index.ts`, defeating tree-shaking and inflating startup.

- **Detection**: ESLint rules `no-barrel-files` (eslint-plugin-barrel-files), Biome's `noBarrelFile` and `noReExportAll`, Oxlint's `oxc/no-barrel-file`.
- **Fix**: consumers import from deep paths directly (`import { x } from "pkg/a"`). Preserve the barrel only as a convenience entry point — do not route hot internals through it.

### Redundant parsing and serialization

`JSON.parse(JSON.stringify(x))` as a deep-clone is slow and allocates. Repeated `JSON.parse` of the same string inside a loop is almost always a cache miss.

- **Fix**: `structuredClone(x)` for deep clone (Node ≥17 global). Parse once, cache.

### Sync I/O in async paths

`fs.readFileSync`, `execSync`, synchronous `sharp` / `image-size` calls inside an async request handler stall the event loop.

- **Fix**: use the async counterpart. If sync is unavoidable, move it to a worker.

### Redundant packages

Two deps that do the same work both loaded at startup — e.g. two JSON schema validators, two YAML parsers — double parse time.

- **Fix**: pick one. (This is cleanup *and* speedup — the pillars overlap.)

### ESLint as a speedup tool

`@e18e/eslint-plugin` includes a `performance-improvements` config with rules like `prefer-array-some`, `prefer-date-now`, `prefer-regex-test`, `prefer-timer-args`. These catch micro-inefficiencies that add up in hot paths.

Install:
```bash
npm install --save-dev @e18e/eslint-plugin
```

Config:
```js
import e18e from "@e18e/eslint-plugin";
export default [e18e.configs["performance-improvements"]];
```

## Workflow

1. **Identify the hot path.** `--cpu-prof`, flamegraph, or DevTools. Do NOT optimize a function you can't prove is hot.
2. **Write a benchmark that reproduces the hot path.** `tinybench` or `mitata`, ~1000 iterations minimum. Commit the benchmark.
3. **Record baseline numbers.** Paste them in the PR.
4. **Make the change.** One change at a time.
5. **Re-run the benchmark.** Paste the new numbers.
6. **If the delta is under ~5%, reject the change.** Noise.

## Do not

- Do not optimize without a profile. "I heard generators are slow" is not a reason to rewrite generators.
- Do not accept "the benchmark got faster" if the production code path isn't actually the benchmarked one.
- Do not assume a win from one machine transfers. Benchmark on a second machine before merging if the delta is small.
- Do not bundle speedup work with cleanup or levelup. Each PR should have one reason to revert.

# Levelup Reference

> Source: https://e18e.dev/guide/levelup.html and the module-replacements manifests.

Levelup is about *generation change*, not version bump. Moving from a dep that is "correct but dated" to a dep that is "correct and designed for the platform as it exists now."

## What makes a replacement a levelup

A swap is a levelup (not just a cleanup) when the replacement is:

- **ESM-first** where the original was CJS with ESM bolted on.
- **Typed** (ships real `.d.ts`, not `@types/*`) where the original required a separate types package.
- **Tree-shakeable** (named exports, no side effects) where the original was one blob.
- **Node-first / modern-runtime-first** where the original was written to run anywhere including IE8.
- **Focused** (does one thing) where the original was a utility bundle.
- **Smaller** (measurable install/bundle size reduction).
- **Actively maintained** where the original hasn't shipped in a long time.

A swap that changes only the version (e.g. `lodash@4` → `lodash@5`) is a dep bump. A swap from `lodash` to `es-toolkit` is a levelup.

## Where to look for replacements

Three communities consistently produce drop-in modern replacements:

- **[tinylibs](https://github.com/tinylibs)** — tinyexec, tinyglobby, tinyspy, tinyrainbow, tinybench. Deliberately tiny, ESM-native.
- **[unjs](https://github.com/unjs)** — h3, defu, pathe, consola, ofetch, destr, jiti, citty, mlly. Universal (Node/Browser/Workers), ESM-first.
- **[es-tooling](https://github.com/es-tooling)** — hosts `module-replacements` itself plus several replacements.

→ Consult [module-replacements.md](./module-replacements.md) for the curated `original → replacement` table.

## The levelup checklist

Before recommending a replacement, verify:

1. **Node floor compatible.** Check the replacement's `engines.node` against the project's Node floor.
2. **Module format compatible.** If the project ships CJS, confirm the replacement has a `require`-compatible entry (or the project is actively moving off CJS).
3. **Types present and reasonable.** Check the replacement's `package.json` has a `types` export map, not an external `@types` dep.
4. **API shape acceptable.** Most levelup replacements are *not* drop-in. They're better, but different. Expect to rewrite call sites.
5. **Maintenance active.** Last publish within the past year, issues triaged, tagged releases. A "modern, lean" dep that hasn't been touched in two years is a future cleanup target.
6. **Bundle delta meaningful.** Use `pkg-size.dev` to compare. If the new dep is 4kB smaller than a 40kB one, the win exists but isn't headline-worthy — say so.

## Levelup for package authors

If you maintain a package, levelup applies to *your own* code, not just your deps:

- **Publishing format**: ESM-first with a CJS-compatible build via `exports` conditions. `publint` will guide you.
- **Types**: ship `.d.ts` in-package. If you use TypeScript, `attw` (are-the-types-wrong) validates your type exports across resolution modes.
- **Entry points**: expose a flat, named-export API. Avoid default-exporting objects; it kills tree-shaking.
- **Side-effect free**: add `"sideEffects": false` to `package.json` when true. This is the single biggest lever for letting consumers tree-shake you.
- **No unnecessary runtime polyfills.** Ship the modern API. Let consumers polyfill if they need to support older targets.

See the `/publint` command for the author-side checklist.

## Common levelup swaps

These are recurring enough to be worth internalizing. Each assumes the replacement is compatible with the project's constraints — verify before recommending.

| Category | Original | Levelup target | Why |
|---|---|---|---|
| Terminal color | `chalk` | `picocolors` (tiny) or `util.styleText` (native on ≥20) | No dep, same ergonomics |
| Subprocess | `execa` | `tinyexec` | 1/10th the install size |
| Config loader | `cosmiconfig` | `lilconfig` | Faster, smaller, same API shape |
| Glob | `glob` or `fast-glob` | `tinyglobby` | Smaller, actively maintained |
| Deep equal | `deep-equal` | `dequal` | Smaller, faster |
| Dates | `moment` | `day.js` (drop-in-ish) or native `Intl.*` | moment is in maintenance mode |
| HTTP client | `axios`, `node-fetch`, `got` | `fetch` (native) or `ofetch` (unjs) | Native on Node ≥18 |
| Utility bundle | `lodash` | `es-toolkit` | ESM-first, typed, tree-shakeable |
| HTTP framework | `express` | `h3` or `hono` | Modern router, tiny, runtime-agnostic |
| ID generation | `shortid`, `uuid@<9` | `nanoid` or `crypto.randomUUID()` | Native or smaller |
| Debug logging | `debug` | `obug` or `consola` | Smaller and/or better UX |
| TOML | `@iarna/toml` | `smol-toml` | Smaller, faster |
| Deep merge | `@75lb/deep-merge`, `deepmerge` | `defu` | Tiny, predictable semantics |
| JWT | `jsonwebtoken` | `jose` | Web-standard, runtime-agnostic |
| JSON parse fallbacks | `safe-json-parse` | `destr` | Handles the common "string that might be JSON" case |
| Path manipulation | `path` with manual Windows handling | `pathe` | Normalized slashes across OSes |
| Dynamic require for tooling | `jiti@<2` | `jiti@2+` | Substantial rewrite, much faster |
| Dotenv | `dotenv` | `node --env-file=.env` (Node ≥20) | Native |

## Do not

- Don't recommend a levelup without checking the three compatibility gates: Node floor, module format, types.
- Don't recommend a levelup that forces a breaking change on downstream consumers of *your* package without flagging it as breaking.
- Don't chase the newest package. Recent ≠ better. Check maintenance activity, not just npm publish recency.
- Don't recommend a replacement you haven't seen working at your Node floor. When in doubt, test.

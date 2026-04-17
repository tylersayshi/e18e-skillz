# Module Replacements Reference

> Curated from the community manifest at https://github.com/es-tooling/module-replacements.
> Always verify against the upstream manifest before recommending — the ecosystem moves.

This file lists `original -> replacement` swaps where the replacement is **a different package** (not a native API — see [native-replacements.md](./native-replacements.md) for those).

Check compatibility — Node floor, module format, types — before recommending any entry.

## Preferred replacements

Lean, modern alternatives to commonly-used packages.

| Original | Replacement | Reason |
|---|---|---|
| `lodash` | `es-toolkit` | ESM-first, typed, tree-shakeable |
| `underscore` | `es-toolkit` | Same as above |
| `moment` | `day.js` | Tiny, similar API; moment is in maintenance mode |
| `axios` | `fetch` (native) or `ofetch` (unjs) | Standard API, smaller footprint |
| `node-fetch` | `fetch` (native) | Global on Node ≥18 |
| `got` | `fetch` (native) or `ofetch` | Same |
| `request` / `@cypress/request` | `fetch` (native) | Request is deprecated |
| `execa` | `tinyexec` | ~10x smaller |
| `@jsdevtools/ez-spawn` | `tinyexec` | Same |
| `glob` | `tinyglobby` | Smaller, actively maintained |
| `fast-glob` | `tinyglobby` | Same |
| `globby` | `tinyglobby` | Same |
| `fs-extra` | `node:fs/promises` (native) | Covers most uses |
| `rimraf` | `fs.rm` (native, Node ≥14) | Native recursive delete |
| `mkdirp` | `fs.mkdir(..., { recursive: true })` | Native |
| `chalk` | `picocolors` (tiny) or `util.styleText` (native ≥20) | No dep needed |
| `kleur` | `picocolors` or `util.styleText` | Same |
| `colorette` | `picocolors` or `util.styleText` | Same |
| `cosmiconfig` | `lilconfig` | Faster, smaller, compatible API |
| `deep-equal` | `dequal` | Smaller, faster |
| `deepmerge` | `defu` | Tiny, predictable |
| `@75lb/deep-merge` | `defu` | Same |
| `debug` | `obug` | Tiny, browser + Node |
| `shortid` | `nanoid` | Smaller, faster; shortid is deprecated |
| `uuid` | `crypto.randomUUID()` (native) or `nanoid` | Native on Node ≥16 |
| `jsonwebtoken` | `jose` | Web-standard, runtime-agnostic |
| `express` | `h3` or `hono` | Tiny, modern routing |
| `@iarna/toml` | `smol-toml` | Smaller, faster |
| `dotenv` | `node --env-file=.env` (native ≥20) | Native |
| `qs` | `URLSearchParams` (native) | Web standard |
| `url-parse` / `whatwg-url` | `URL` (native) | Native |
| `shelljs` | `tinyexec` or `zx` | Smaller or more ergonomic |
| `jiti@<2` | `jiti@2+` | Substantial rewrite, much faster |
| `readable-stream` | `node:stream` (native) | Polyfill no longer needed |
| `through` / `through2` | `node:stream` (native) | Polyfill no longer needed |
| `clipboardy` | `ClipboardAPI` (browser) / child-process fallback | Native on browser |
| `inherits` | `util.inherits` or ES class `extends` | Native |
| `string-width` (in Bun) | `Bun.stringWidth` | Runtime-native |

## Micro-utility replacements

These are the single-purpose packages where the replacement is usually a one-liner, not another package. Prefer inline.

| Original | Replacement (inline) |
|---|---|
| `array-last` | `arr.at(-1)` |
| `array-union` | `[...new Set([...a, ...b])]` |
| `array-uniq` | `[...new Set(arr)]` |
| `arr-flatten` | `arr.flat(Infinity)` |
| `arr-diff` | `a.filter(x => !b.includes(x))` |
| `is-string` | `typeof v === "string"` |
| `is-number` | `typeof v === "number" && Number.isFinite(v)` |
| `is-boolean-object` | `Object.prototype.toString.call(v) === "[object Boolean]"` |
| `is-ci` | `Boolean(process.env.CI)` |
| `is-windows` | `process.platform === "win32"` |
| `is-npm` | `process.env.npm_config_user_agent?.startsWith("npm")` |
| `lower-case` | `str.toLocaleLowerCase()` |
| `base64id` | `crypto.randomBytes(15).toString("base64")` |

For the full micro-utility list, read `manifests/micro-utilities.json` upstream.

## How to use this list

1. Check that the original is actually in use (not a transitive you can't touch).
2. Verify the replacement fits the project's Node floor and module format.
3. For preferred replacements, read the replacement's README — the API is usually similar but not identical.
4. Measure before/after install and/or bundle size. Record in the PR.
5. One package per PR. Don't batch.

## What this list is not

- Not exhaustive. The upstream manifests are the source of truth.
- Not timeless. Maintenance activity shifts; a "preferred" dep can become a cleanup target. Re-check annually.
- Not universal. An entry is "usually better" — project constraints can make any of these the wrong call.

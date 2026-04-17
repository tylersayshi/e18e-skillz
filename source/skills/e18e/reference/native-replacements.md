# Native Replacements Reference

> Curated from the `native` manifest at https://github.com/es-tooling/module-replacements.

Modules that can be replaced with a native platform API. **Always the first replacement choice** when the project's runtime floor supports the native equivalent.

Each entry notes the minimum Node version where the native API is available. For browser-only targets, consult [MDN's baseline browser support](https://developer.mozilla.org/en-US/docs/Glossary/Baseline) for each API.

## Array and iteration

| Original | Native | Node ≥ |
|---|---|---|
| `array.from` | `Array.from` | 4 |
| `array.of` | `Array.of` | 4 |
| `array.prototype.at` | `Array.prototype.at` | 16.6 |
| `array.prototype.flat` | `Array.prototype.flat` | 11 |
| `array.prototype.flatmap` | `Array.prototype.flatMap` | 11 |
| `arraybuffer.prototype.slice` | `ArrayBuffer.prototype.slice` | 4 |
| `concat-map` | `Array.prototype.flatMap` | 11 |
| `for-each` | `for...of` loop | any |
| `for-in` | `for...in` loop | any |

## Collections and promises

| Original | Native | Node ≥ |
|---|---|---|
| `es-map` | `Map` | any |
| `es-set` | `Set` | any |
| `weak-map` | `WeakMap` | any |
| `es6-promise` | `Promise` | any |
| `native-promise-only` | `Promise` | any |
| `bluebird` | `Promise` | any |
| `promise.allsettled` | `Promise.allSettled` | 12.9 |
| `promise.any` | `Promise.any` | 15 |
| `queue-microtask` | `queueMicrotask` | 11 |
| `aggregate-error` / `es-aggregate-error` | `AggregateError` | 15 |

## Object and property helpers

| Original | Native | Node ≥ |
|---|---|---|
| `object-assign` | `Object.assign` | 4 |
| `object.entries` | `Object.entries` | 7 |
| `object.fromentries` | `Object.fromEntries` | 12 |
| `define-properties` | `Object.defineProperties` | any |
| `define-property` | `Object.defineProperty` | any |
| `has` | `Object.hasOwn` (native ≥16.9) or `Object.prototype.hasOwnProperty.call(...)` | 16.9 / any |
| `function-bind` | `Function.prototype.bind` | any |
| `xtend` | `Object.assign` | 4 |
| `global` | `globalThis` | 12 |

## Strings and regex

| Original | Native | Node ≥ |
|---|---|---|
| `left-pad` | `String.prototype.padStart` | 8 |
| `repeat-string` | `String.prototype.repeat` | 4 |
| `string.prototype.matchall` | `String.prototype.matchAll` | 12 |
| `string.prototype.padstart` | `String.prototype.padStart` | 8 |
| `string.prototype.replaceall` | `String.prototype.replaceAll` | 15 |
| `string.raw` | `String.raw` | 4 |
| `escape-string-regexp` | `RegExp.escape` (browser/Node when available) or manual `str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")` | — |

## Encoding, IDs, crypto

| Original | Native | Node ≥ |
|---|---|---|
| `atob` | `atob` | 16 |
| `btoa` | `btoa` | 16 |
| `buffer-from` | `Buffer.from` | any |
| `is-buffer` | `Buffer.isBuffer` | any |
| `uuid` (v4) | `crypto.randomUUID()` | 16.7 |

## Timing

| Original | Native | Node ≥ |
|---|---|---|
| `date-now` | `Date.now` | any |
| `raf` | `requestAnimationFrame` (browser) | — |

## URL and querystring

| Original | Native | Node ≥ |
|---|---|---|
| `url-parse` | `URL` | 10 |
| `whatwg-url` | `URL` | 10 |
| `qs` (basic use) | `URLSearchParams` | 10 |

## Streams

| Original | Native | Node ≥ |
|---|---|---|
| `readable-stream` | `node:stream` | any |
| `through` / `through2` | `node:stream` + `Transform` | any |

## Error and iteration protocol

| Original | Native | Node ≥ |
|---|---|---|
| `is-error` | `Error.isError` (where available) or `instanceof Error` | — |
| `iterator.prototype` | `Iterator.prototype` | 22+ (behind flag earlier) |
| `asynciterator.prototype` | `AsyncIterator.prototype` | 22+ |

## Abort

| Original | Native | Node ≥ |
|---|---|---|
| `abort-controller` | `AbortController` | 15 |
| `event-target-shim` | `EventTarget` | 15 |

## Filesystem

| Original | Native | Node ≥ |
|---|---|---|
| `rimraf` | `fs.rm(path, { recursive: true, force: true })` | 14.14 |
| `mkdirp` | `fs.mkdir(path, { recursive: true })` | 10.12 |
| `fs-extra.copy` | `fs.cp` | 16.7 |

## Networking

| Original | Native | Node ≥ |
|---|---|---|
| `node-fetch` | `fetch` | 18 |
| `axios` (basic use) | `fetch` | 18 |
| `isomorphic-fetch` | `fetch` | 18 |

## Text and Unicode

| Original | Native | Node ≥ |
|---|---|---|
| `grapheme-splitter` | `Intl.Segmenter` | 16 |
| `strip-ansi` | `util.stripVTControlCharacters` | 16.11 |
| `chalk` | `util.styleText` | 20 |

## Environment

| Original | Native | Node ≥ |
|---|---|---|
| `dotenv` | `node --env-file=.env` | 20 |

## Number conversion

| Original | Native | Node ≥ |
|---|---|---|
| `long` (for 64-bit integers) | `BigInt` | any |

## How to use this list

- Always check the project's Node floor before recommending a native. The `Node ≥` column is the gate.
- For browsers, check the API is baseline — not all Node natives are DOM-compatible (e.g. `util.stripVTControlCharacters` is Node-only).
- `fetch` on Node 18 is still marked "experimental" in some docs but is stable in practice. On ≥21 it is no longer marked experimental.
- When replacing, grep for the full usage pattern. `axios.post(url, data)` → `fetch` requires converting body + headers, not a one-line swap.

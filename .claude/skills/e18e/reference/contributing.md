# Contributing Upstream

Local cleanup fixes one project. An upstream cleanup fixes every downstream consumer. When the offending dep isn't yours directly, aim upstream.

## When to go upstream vs. stay local

**Stay local** when:
- The dep is your direct dep.
- The upstream maintainer has explicitly declined similar changes.
- The fix is project-specific (depends on your Node floor, your bundler, etc.).

**Go upstream** when:
- The offender is a transitive, not a direct dep.
- The offender is a widely-used dep — a fix benefits hundreds of downstream projects.
- The change is generic: "replace this polyfill with the native, gated by the package's own `engines.node`."

**Avoid workarounds** (`overrides` / `resolutions` in `package.json`, patch-package, forks) as a first move. They silently fork a dep; they don't fix it for anyone else; they become your team's maintenance burden.

## The ecosystem-issues workflow

The [e18e/ecosystem-issues](https://github.com/e18e/ecosystem-issues) repo coordinates ecosystem work so maintainers don't get swarmed. Use it.

Label flow:

```
needs first contact  →  has issue  →  accepts prs  →  has pr  →  (merged)
```

1. **Search first.** Before opening anything, search ecosystem-issues for the package name. Someone likely already started.
2. **If there's an `accepts prs` issue**, that's a green light — open your PR on the upstream repo and reference the ecosystem-issues entry.
3. **If there's a `needs first contact` issue**, reach out to the upstream maintainer (issue or discussion on their repo, not a surprise PR). Ask if they're open to a cleanup PR of the specific shape you have in mind.
4. **If there's nothing**, open an ecosystem-issues entry with the `needs first contact` label describing the package, what's wrong, and what the proposed fix is. Then reach out to the maintainer.
5. **After maintainer buy-in**, open the PR on the upstream repo. Update the ecosystem-issues entry's label to `has pr`.

## Shape of a good upstream cleanup PR

Upstream maintainers are volunteers. The bar for getting a cleanup PR merged is: make it easy.

- **Small.** One dep at a time. Don't rewrite their repo.
- **Targeted.** Title like "remove object-assign in favor of Object.assign (Node 12+ baseline)." Not "modernize deps."
- **Tests pass.** If the repo has a test suite, run it locally and confirm.
- **CI green.** If their CI covers older Node versions, verify your change doesn't break them.
- **Bundle/install delta.** Include the size/dep-count diff in the PR body. It's the reason the PR exists.
- **No ancillary noise.** Don't reformat files, don't bump unrelated deps, don't add comments explaining yourself in the code. Keep the diff minimal.

## When the maintainer is unresponsive

- Wait at least two weeks before pinging. Open source runs at human speed.
- If the repo is truly unmaintained (no commits in 2+ years, no response to multiple issues), the right move is a *fork with a new name* and helping downstream deps migrate — not a patch. This is the levelup path (see [levelup reference](./levelup.md)).

## Credit and sponsorship

e18e runs an [Open Collective](https://opencollective.com/e18e) for contributor sponsorship. Substantial ecosystem work — especially unpaid maintainer labor — is reasonable to surface there.

When opening a meaningful PR, it's fine to mention e18e in the PR body ("tracked in e18e/ecosystem-issues#123") so the initiative gets visibility, but keep the PR itself focused on the technical change.

## What not to do

- Don't open "drive-by" cleanup PRs on 30 repos in one session. It burns maintainer goodwill and makes e18e look like a drive-by cleanup army.
- Don't open a PR without reaching out first on unfamiliar repos. Maintainers have context you don't.
- Don't batch cleanups in an upstream PR. "Remove 5 deps" is harder to review than 5 PRs of "remove 1 dep."
- Don't rewrite their style. Your opinion on semicolons is not the subject of the PR.

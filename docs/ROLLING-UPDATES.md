# Rolling updates: how the template stays current forever

This template is the core of the landing-page fleet. If it rots, everything
built on it rots. So updates are a runway, not a chore -- automated where
possible, gated where it matters.

## The weekly heartbeat (automated)

`.github/dependabot.yml` opens grouped PRs every Monday 09:00 Chicago:

- **build-stack group** -- vite, svelte, tailwind, vitest, testing-library,
  lucide, sass-embedded. One PR, one review, one merge.
- **github-actions group** -- checkout, setup-node, etc.

Each PR runs the CI gate. **Green + review = merge. Red = stop.**
A red update PR is never force-merged; it stays open until the breakage is
understood. That is the whole fail-safe philosophy: the template cannot
ship a state that doesn't build and pass its smoke test.

## The monthly sweep (manual, 15 minutes)

Dependabot groups miss things. Once a month:

1. `npm outdated` -- anything major that the groups held back.
2. Check the Node LTS schedule -- CI pins the current LTS
   (24 as of 2026-09). When a new LTS goes active, bump `ci.yml`,
   run the full gate, merge.
3. Check action majors -- `actions/checkout`, `actions/setup-node`.
   Dependabot covers these weekly, but confirm nothing is pinned stale.
4. `npm audit` -- triage; fix or document exceptions.

## The fail-safes (why this can't get fucked)

1. **Lockfile committed, `npm ci` in CI.** Reproducible installs.
   If package.json and the lockfile disagree, CI fails loudly.
2. **CI builds AND tests on every PR.** The old workflow ran
   `test:run --if-present` with no such script -- it passed vacuously.
   Now `test:run` exists and the smoke test (`src/App.test.js`) must pass:
   the template has to boot and render localized content, or nothing ships.
3. **Branch protection (manual one-time setup).** In repo Settings >
   Branches > Add rule for `master`: require a pull request before merging
   + require status checks to pass (`build-and-test`). Do NOT require
   approvals (solo flow stays fast) and do NOT enforce on admins (no
   lockout trap -- you can always break glass).
4. **No direct pushes to master.** Per repo house rules, all work lands on
   branches; master only moves via reviewed PRs.
5. **Node LTS, never EOL.** CI failed its purpose on Node 20
   (deprecated runtime). The version is pinned to the active LTS and the
   monthly sweep keeps it there.

## Pushing updates to the fleet

Sites built from this template pull updates; the template never pushes to
them. When a template change matters to consumers (new CI, dep bumps):

1. Note it in the PR description with a `fleet:` line.
2. Consumer repos rebase their template-derived files (workflows,
   configs) onto the new versions -- checklist per repo, tracked in the
   landing-page goal.

## What NOT to do

- Don't add a dependency without the cost-benefit check in AGENTS.md
  (native APIs win; 20 lines of vanilla beats a library).
- Don't merge a red Dependabot PR "because it's just deps."
  That's exactly how fleets get fucked.
- Don't let the Node version drift past EOL again.

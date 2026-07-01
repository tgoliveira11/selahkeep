# Releasing — SelahKeep

Manual, versioned releases for **tgoliveira11/selahkeep**. This app is **not** an npm package; nothing is published to a registry.

---

## Release invariant

For every version **X.Y.Z**:

```text
package.json "version" = X.Y.Z
        ⟺
git tag vX.Y.Z (annotated)
        ⟺
GitHub Release vX.Y.Z
```

The workflow [`.github/workflows/release.yml`](../.github/workflows/release.yml) establishes all three in one run, or completes missing pieces in **recovery mode** without double-bumping.

**Canonical version source:** `package.json` → `"version"`.

---

## Manual only

| Rule | Detail |
|------|--------|
| Trigger | `workflow_dispatch` only — no push/tag/release triggers |
| Prerequisite | The **Release** workflow runs the full **`validate`** job first; release steps abort if CI checks fail |
| Who runs it | Maintainer (or explicit request) — **not** agents by default |
| Deploy | Vercel / other hosting is **outside** this workflow |
| npm publish | **Never** — `private: true` |

---

## When to release

1. `main` contains the changes you want shipped.
2. `CHANGELOG.md` → `## [Unreleased]` has notes for the release (non-empty substantive content).
3. `npm run validate` passes on `main`.

---

## How to release (new version)

1. Open **Actions** → **Release** → **Run workflow**.
2. **Version input** (optional):

| Input | Behavior |
|-------|----------|
| *(blank)* or `auto` | Patch bump from current `package.json` version |
| `patch` / `minor` / `major` | SemVer bump |
| `x.y.z` | Exact version (must be ≥ current and valid SemVer) |

3. Workflow steps:
   - Pre-flight: `[Unreleased]` must have content for a **new** release.
   - `scripts/prepare-release.mjs` rolls changelog → `## [X.Y.Z] - YYYY-MM-DD`, updates `package.json`.
   - If metadata changed: commit `Release X.Y.Z` on `main` as `github-actions[bot]`.
   - Create and push annotated tag `vX.Y.Z`.
   - Create GitHub Release **vX.Y.Z** with notes from the new changelog section.

4. **Deploy** production separately (e.g. Vercel deploy from `main` or tag — your hosting choice).

Suggested release title: **SelahKeep X.Y.Z**

---

## Recovery mode

Use when a prior release run failed **after** bumping `package.json` but **before** tag or GitHub Release existed.

**Condition:** `## [Unreleased]` is **empty** (or has no substantive bullets).

**Behavior:**

- Reuses current `package.json` version — **no bump**.
- Creates missing tag `vX.Y.Z` and/or GitHub Release `vX.Y.Z`.
- Release notes taken from existing `## [X.Y.Z]` section in `CHANGELOG.md`, or `--generate-notes` fallback.

**Run:** Actions → Release → Run workflow with version input **blank** or `auto`.

**Fails early** if you request `patch` / `minor` / `major` / explicit `x.y.z` while `[Unreleased]` is empty — add changelog entries first, or use recovery (blank input).

---

## Changelog roll format

Before:

```markdown
## [Unreleased]

### Fixed
- Something users care about
```

After release `0.2.0` on 2026-06-16:

```markdown
## [Unreleased]

## [0.2.0] - 2026-06-16

### Fixed
- Something users care about
```

---

## Local dry-run

```bash
node scripts/prepare-release.mjs --version=patch --dry-run
```

Prints JSON to stdout; does not write files.

---

## Agent restrictions

- Do **not** run `release.yml`, create tags, or publish GitHub Releases unless the maintainer explicitly asks.
- The release workflow may commit version metadata to `main`; that exception applies only to `github-actions[bot]`, not to agents.

---

## Optional gaps (not implemented unless requested)

- Attach build artifacts to GitHub Releases
- GitHub `production` environment with required reviewers for deploy workflows
- `CODEOWNERS` auto-review routing

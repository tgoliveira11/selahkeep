# GitHub repository settings

Target configuration for **tgoliveira11/letter-to-god**. Apply in **Settings → Branches → Branch protection rules** (or via `gh api`).

---

## `main` branch protection

| Setting | Value | Notes |
|---------|-------|-------|
| Require pull request before merging | **Yes** | No direct pushes except release bot (see below) |
| Required status checks | **`validate`**, **`branch-name`** | Strict: branches must be up to date |
| Require linear history | **Yes** | Squash merge preferred |
| Allow force pushes | **No** | |
| Allow deletions | **No** | |
| Lock branch | **Off** | Release workflow must push version commits |

### Status check names

From [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

- Job id **`validate`** — `npm run validate`
- Job id **`branch-name`** — branch prefix `feature/`, `fix/`, `docs/`, `chore/`

After the first workflow run on a PR, enable these as required checks in the UI (exact names match job ids).

---

## Release workflow exception

The **Release** workflow (`workflow_dispatch`) commits `package.json` + `CHANGELOG.md` to `main` as **github-actions[bot]**. Options:

1. **Recommended:** Allow GitHub Actions to bypass pull requests for the `github-actions[bot]` actor (Settings → Actions → General → Workflow permissions → allow bypass for bots), **or**
2. Temporarily relax protection for the release run, **or**
3. Use a PAT with admin rights in the workflow (heavier; not configured by default).

Document which option you chose when enabling protection.

---

## Apply via CLI (maintainer)

```bash
# Example: list current protection (requires gh auth)
gh api repos/tgoliveira11/letter-to-god/branches/main/protection 2>/dev/null || echo "Not configured yet"
```

Branch protection is easiest to configure in the GitHub UI after CI has run at least once (so check names exist).

---

## Squash merge

**Settings → General → Pull Requests:**

- Allow squash merging: **Yes**
- Default merge method: **Squash**

---

## Actions permissions

**Settings → Actions → General:**

- Workflow permissions: **Read and write** (needed for release tags and commits)
- Allow `github-actions[bot]` to create and approve pull requests: optional (not required for release direct push)

---

## Optional (not required for tag + GitHub Release)

| Feature | When to add |
|---------|-------------|
| `production` environment + reviewers | Manual deploy workflow via Actions |
| CODEOWNERS | Team review routing |
| Signed commits required | Org policy |

Deploy to Vercel is typically connected to `main` pushes in the Vercel dashboard — separate from GitHub Releases.

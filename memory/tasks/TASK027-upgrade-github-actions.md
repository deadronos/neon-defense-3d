# TASK027 — Upgrade GitHub Actions to current versions

**Status:** Completed  
**Added:** 2026-10-07  
**Updated:** 2026-10-07

## Original Request

Open a new branch and look into upgrading the GitHub Actions workflows to the current action
versions.

## Thought Process

- The only workflow is `.github/workflows/deploy-on-tag.yml` (build + deploy to GitHub Pages on
  `v*` tags). Its last deploy run still emitted a GitHub annotation that
  `actions/upload-artifact` targeted Node 20 (forced onto Node 24).
- Checked each referenced action's latest release and breaking changes before bumping:
  - `actions/checkout` **v6 → v7** (ESM, blocks fork-PR checkout for `pull_request_target`/`workflow_run`).
  - `actions/setup-node` **v6 → v7** (ESM; caching improvements; removes dummy `NODE_AUTH_TOKEN`).
  - `actions/upload-pages-artifact` **v4 → v5** (pulls in `upload-artifact@v7`, which fixes the Node 20 deprecation).
  - `actions/deploy-pages` **v4 → v5** (Node 24).
- None of the breaking changes affect this workflow (tag-push trigger only; `cache: npm`,
  `node-version: 24`, `path: ./dist` all remain valid).
- Also refreshed the stale action versions in the repo's CI guidance doc and the plan prompt so
  the documented examples match current actions.

## Implementation Plan

- Create branch `chore/update-github-actions`.
- Bump the four action versions in the Pages workflow.
- Update outdated `actions/*@vX` examples in `.github/instructions/github-actions-ci-cd-best-practices.instructions.md`
  and `.github/prompts/breakdown-plan.prompt.md`.
- Validate YAML + Prettier, update memory bank, commit, push, open PR.

## Outcome

`.github/workflows/deploy-on-tag.yml` now uses:

| Action                          | Old | New    |
| ------------------------------- | --- | ------ |
| `actions/checkout`              | v6  | **v7** |
| `actions/setup-node`            | v6  | **v7** |
| `actions/upload-pages-artifact` | v4  | **v5** |
| `actions/deploy-pages`          | v4  | **v5** |

Documentation examples modernised (current versions):

- `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`,
  `actions/download-artifact@v8`, `actions/cache@v6`, `actions/github-script@v9`,
  `aws-actions/configure-aws-credentials@v6`.
- Illustrative Node versions bumped from EOL `16/18` to `20/22/24`.

Validation:

- Workflow YAML parses (`js-yaml`) with jobs `build`, `deploy`.
- `npm run format:check` ✅
- No remaining pre-current `actions/*` references under `.github/`.

Follow-ups / notes:

- The `ubuntu-latest` label migrates to Ubuntu 26 on 2026-10-19; no change required unless we want
  to pin an explicit image.
- The build output bundle is >500 kB — consider code-splitting separately (out of scope here).

# Aligned Instructions

This document lists the instruction files in `.github/instructions/` and detailing modifications made to align them with the project structure and best practices.

## Summary of Changes

1.  **Modified `.github/copilot-instructions.md`**:
    - **Purpose**: Acts as the "Source of Truth" for the project, as referenced by `AGENTS.md`.
    - **Change**: Rewrote content to aggregate architecture, tech stack, workflows, and conventions specific to Neon Defense 3D.
    - **Reasoning**: The file existed but contained outdated or less structured information. It now serves as the central hub referencing other detailed instructions.

2.  **Modified `.github/instructions/markdown.instructions.md`**:
    - **Change**: Removed blog-specific frontmatter validation (e.g., `post_slug`, `microsoft_alias`).
    - **Reasoning**: The repo is a game project, not a blog. The instructions now focus on standard Markdown documentation practices.

3.  **Modified `.github/instructions/playwright-typescript.instructions.md`**:
    - **Change**: Updated test directory path from `tests/` to `tests/e2e/`.
    - **Reasoning**: Aligns with `playwright.config.ts` which specifies `testDir: 'tests/e2e'`.

4.  **Modified `.github/instructions/spec-driven-workflow-v1.instructions.md`**:
    - **Change**: Removed duplicated/corrupted file header appended to the end of the file.
    - **Reasoning**: Fixed file integrity.

## Instruction Files Overview

| File                                                          | Purpose                                                           | Status       |
| :------------------------------------------------------------ | :---------------------------------------------------------------- | :----------- |
| `ai-prompt-engineering-safety-best-practices.instructions.md` | Guidelines for creating safe and effective AI prompts.            | Unchanged    |
| `code-review-generic.instructions.md`                         | Standards and checklist for code reviews.                         | Unchanged    |
| `github-actions-ci-cd-best-practices.instructions.md`         | Best practices for CI/CD workflows.                               | Unchanged    |
| `markdown.instructions.md`                                    | Rules for Markdown formatting and structure.                      | **Modified** |
| `memory-bank.instructions.md`                                 | Instructions for using the Memory Bank system.                    | Unchanged    |
| `nodejs-javascript-vitest.instructions.md`                    | JS/Node guidelines. (Applies to config files in this TS project). | Unchanged    |
| `performance-optimization.instructions.md`                    | General performance optimization guide.                           | Unchanged    |
| `playwright-typescript.instructions.md`                       | Guidelines for writing E2E tests with Playwright.                 | **Modified** |
| `powershell.instructions.md`                                  | PowerShell scripting guidelines.                                  | Unchanged    |
| `prompt.instructions.md`                                      | Guidelines for creating `.prompt.md` files.                       | Unchanged    |
| `reactjs.instructions.md`                                     | React development standards (React 19+, Hooks).                   | Unchanged    |
| `spec-driven-workflow-v1.instructions.md`                     | The core 6-phase development workflow.                            | **Modified** |
| `typescript-5-es2022.instructions.md`                         | TypeScript coding standards.                                      | Unchanged    |

## Verification

- Verified `AGENTS.md` reference to `.github/copilot-instructions.md` is now valid.
- Verified `playwright.config.ts` matches the new path in instructions.
- Verified file content integrity for modified files.

# AI Agent Roles & Responsibilities

## The Architect

- **Focus:** High-level design, system patterns, and requirements analysis.
- **Actions:**
  - Reads `projectbrief.md` and `systemPatterns.md`.
  - Creates design documents in `/memory/designs/`.
  - Breaks down features into tasks in `/memory/tasks/`.

## The Developer

- **Focus:** Writing code, fixing bugs, and implementation.
- **Actions:**
  - **Strictly follows** the **Architecture** and **Key Conventions** in `copilot-instructions.md`.
  - Updates `activeContext.md` with current progress.
  - Writes tests and validates changes.

## The Reviewer

- **Focus:** Quality assurance, security, and performance.
- **Actions:**
  - Verifies adherence to `copilot-instructions.md`.
  - Checks for "Technical Debt" and logs it in `progress.md`.

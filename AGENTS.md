# AI Agents Guide

This document outlines the protocols, workflows, and resources for AI agents working on the **Neon Defense 3D** project.

## 🚨 CRITICAL: Primary Instruction File

All agents **MUST** read and follow the project-specific instructions defined in:
👉 **[.github/copilot-instructions.md](.github/copilot-instructions.md)**

This file is the **Source of Truth** for:

- **Architecture:** Component boundaries, Game Loop logic, and State Management.
- **Conventions:** Coordinate systems, R3F usage, and React patterns.
- **Workflows:** How to add entities (Towers, Enemies) and modify the map.
- **Tech Stack:** Specific versions and libraries used.

**Do not attempt to modify code without understanding the conventions laid out in `copilot-instructions.md`.**

---

## 📂 Memory & Context System

This project utilizes a **Memory Bank** system to maintain context across sessions. Agents are expected to maintain this documentation as they work.

- **Root Directory:** `/memory`
- **Key Files:**
  - `projectbrief.md`: Core requirements and goals.
  - `activeContext.md`: Current work focus and recent changes.
  - `systemPatterns.md`: Architecture and design decisions.
  - `techContext.md`: Technology constraints and setup.

### Task Tracking

- **Index:** `/memory/tasks/_index.md`
- **Task Plans:** `/memory/tasks/TASKID-taskname.md`

## 🔄 Operational Workflows

### 1. Specification-Driven Development

We follow a strict **Spec-Driven Workflow** (Analyze → Design → Implement → Validate).

- **Reference:** `.github/instructions/spec-driven-workflow-v1.instructions.md`
- **Requirement:** Before writing code, ensure a clear plan exists in `/memory/tasks/`.

### 2. Design First

- Complex features require a design document in `/memory/designs/`.
- Design IDs must be unique.

## 🤖 Agent Roles & Responsibilities

### The Architect

- **Focus:** High-level design, system patterns, and requirements analysis.
- **Actions:**
  - Reads `projectbrief.md` and `systemPatterns.md`.
  - Creates design documents in `/memory/designs/`.
  - Breaks down features into tasks in `/memory/tasks/`.

### The Developer

- **Focus:** Writing code, fixing bugs, and implementation.
- **Actions:**
  - **Strictly follows** the **Architecture** and **Key Conventions** in `copilot-instructions.md`.
  - Updates `activeContext.md` with current progress.
  - Writes tests and validates changes.

### The Reviewer

- **Focus:** Quality assurance, security, and performance.
- **Actions:**
  - Verifies adherence to `copilot-instructions.md`.
  - Checks for "Technical Debt" and logs it in `progress.md`.

## 🚀 Quick Start Protocol

1. **Initialize:** Read `AGENTS.md` (this file) and `.github/copilot-instructions.md`.
2. **Contextualize:** Read `/memory/activeContext.md` and `/memory/projectbrief.md`.
3. **Plan:** Check `/memory/tasks/_index.md` for the next available task.
4. **Execute:** Follow the Spec-Driven Workflow.

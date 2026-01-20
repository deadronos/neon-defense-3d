# AI Agents Guide

This document outlines the protocols, workflows, and resources for AI agents working on the **Neon Defense 3D** project.

## 🚨 CRITICAL: Primary Instruction File

All agents **MUST** read and follow the project-specific instructions defined in:
👉 **[.github/copilot-instructions.md](.github/copilot-instructions.md)**

This file is the **Source of Truth** for Architecture, Conventions, Workflows, and Tech Stack.

## 📚 Essential Documentation

- **[Agent Roles](docs/agent-roles.md)**: Definitions of Architect, Developer, and Reviewer roles.
- **[Feature Blueprints](docs/workflows.md)**: Detailed workflows for common tasks (e.g., adding towers, game loop).
- **[Memory Bank Instructions](.github/instructions/memory-bank.instructions.md)**: How to maintain context across sessions.

## 🚀 Quick Start Protocol

1. **Initialize:** Read `AGENTS.md` (this file) and `.github/copilot-instructions.md`.
2. **Contextualize:** Read `/memory/activeContext.md` and `/memory/projectbrief.md`.
3. **Plan:** Check `/memory/tasks/_index.md` for the next available task.
4. **Pre-checks:** Run `npm run format && npm run lint && npm run typecheck && npm run test` (use `npm run lint:fix` where appropriate) and ensure all checks pass locally.
5. **Execute:** Follow the **Spec-Driven Workflow** (Analyze → Design → Implement → Validate), referenced in `.github/copilot-instructions.md`.

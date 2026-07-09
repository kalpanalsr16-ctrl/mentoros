# MentorOS - Claude Project Instructions

## Project Overview

MentorOS is an AI-native tutoring platform designed for Primary and High School students.

The goal is to build a production-quality AI system using multiple specialized agents rather than one large prompt.

This repository follows an architecture-first approach. Documentation is considered the source of truth.

---

# Working Principles

Before making any changes:

1. Read this file first.
2. Read only the documents required for the current task.
3. Do not read the entire repository unless explicitly requested.
4. Minimize token usage by limiting context to relevant files.
5. Never invent architecture that conflicts with existing documentation.

---

# Source of Truth

The documentation is the source of truth.

If implementation conflicts with documentation:

Documentation wins.

If documentation conflicts internally:

Stop and ask for clarification.

Do not guess.

---

# Repository Structure

## Product Documentation

docs/

- Product Principles
- Vision
- PRD
- User Personas
- Learner Journey
- Learner Profile Model
- System State Model
- Technical Architecture
- Event Driven Architecture
- Evaluation Framework
- Roadmap

---

## Agent Documentation

05_Agent_Architecture/

Contains:

- Architecture Overview
- Agent Template
- Architecture Diagram
- Individual Agent Specifications

Each agent document defines:

- Purpose
- Responsibilities
- Inputs
- Outputs
- Events
- State
- Dependencies
- Evaluation
- Success Criteria

---

# Development Philosophy

Implement the project incrementally.

Never attempt to build the entire system in one step.

Work milestone by milestone.

Each milestone should result in a working system.

---

# Coding Principles

- Keep code modular.
- Keep files small.
- Prefer readability over cleverness.
- Avoid duplication.
- Follow the documented architecture.
- Reuse existing components whenever possible.

---

# Agent Principles

Every AI agent should:

- Have a single responsibility.
- Read only the required state.
- Write only the state it owns.
- Communicate using events.
- Be independently testable.

---

# Prompting Rules

When given a task:

1. Read only the required documents.
2. Explain your implementation plan.
3. Wait for approval before generating code.
4. Implement one milestone only.
5. Never refactor unrelated parts of the project.

---

# If Documentation Is Missing

If required documentation does not exist:

Stop.

Recommend what should be documented.

Do not invent missing product requirements.

---

# Default Workflow

For every task:

1. Understand the requirement.
2. Identify the minimum required documents.
3. Read only those documents.
4. Explain the implementation approach.
5. Wait for approval.
6. Generate code.
7. Explain what changed.
8. Suggest tests.

---

# Communication Style

- Be concise.
- Be practical.
- Explain trade-offs.
- Challenge poor architectural decisions.
- Prefer maintainability over shortcuts.

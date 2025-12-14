# Third Brain Companion (TBC)

Third Brain Companion (TBC) is a framework for building durable AI companions whose memory, identity, and behavior are explicit, inspectable, and version-controlled.

TBC is not a chatbot and not a prompt library. It is a system of record for thinking.

## What This Repository Is (and Is Not)

This repository is the **TBC project repository**.

It contains:

- The CLI and core framework code
- System specifications
- Documentation for users, testers, and developers

It is **not** a TBC instance.

A **TBC instance** (one or more companions, with their memory and history) must live in a **separate repository**.

This separation is intentional and mandatory.

## Why TBC Exists

Most AI systems suffer from three structural limitations:

1. Memory is implicit (chat logs, embeddings, opaque stores)
2. Behavior is unverifiable (hidden prompts, mutable internal state)
3. History is disposable (no durable audit trail)

TBC addresses these problems by treating:

- Records as memory
- Specifications as law
- Flows as behavior
- Git as truth

The result is an AI companion whose cognition can be audited, evolved, reverted, and safely operated over long periods of time.

## Core Mental Model

If you understand the following concepts, you understand TBC:

- **Vault**: Plain-text, git-versioned memory (lives in a TBC instance repo)
- **Record**: An atomic unit of knowledge or state
- **Root Record**: The constitution of a companion
- **Specs**: Canonical system definitions (provided by this project)
- **Flows**: Deterministic operations over records
- **CLI**: An orchestrator, not magic

All meaningful cognitive state lives in the **instance repository**, not here.

## Repository Structure

```
.
├── apps/
│   └── tbc-cli/          # CLI application
│       └── assets/       # Embedded system specs
├── packages/             # Core framework packages
├── doc/                  # Documentation
│   ├── user-guide.md
│   ├── developer-guide.md
│   └── tester-guide.md
└── README.md
```

## Who This Is For

TBC is intended for:

- Developers building long-lived AI agents
- Researchers who need auditable reasoning
- Power users who want ownership of AI memory
- AI assistants that must operate safely and deterministically

If you want quick answers with no history or accountability, this project is not a good fit.

## Getting Started

Choose the guide that matches your role.

### Users

If you want to operate a companion, start with:

- [User Guide](/doc/user-guide.md)

This guide explains how to create and operate a TBC instance in its own repository.

### Testers (Human or AI)

If you run CLI commands, automated tests, or autonomous agents, read:

- [Tester Guide](/doc/tester-guide.md)

This guide is mandatory for safe, non-destructive testing and explicitly addresses AI assistant limitations.

### Developers

If you want to extend or modify TBC itself, read:

- [Developer Guide](/doc/developer-guide.md)

This guide covers architecture, flows, plugins, and extension patterns.

## Safety Notice

Do not run `tbc init`, `tbc dex`, or other destructive commands in this repository.

This repository must never be treated as a TBC root.

Always create or use a **separate repository** for each TBC instance and pass its path explicitly when required.

The Tester Guide documents safe execution patterns in detail.

## Design Guarantees

TBC is built to provide the following guarantees at the **instance level**:

- Deterministic behavior
- Plain-text persistence
- Auditable history
- Toolchain independence

When a guarantee cannot be enforced mechanically, it is made explicit in documentation and specifications.

## Philosophy

You are not outsourcing thinking.

You are externalizing it in a form that can be inspected, versioned, and corrected.

TBC treats cognition as something that should be owned, reviewed, and reversible for both humans and machines.

## Status

- Core CLI and flows are stable
- Plugin system is extensible
- Filesystem storage is the current backend
- Agent-driven operation continues to evolve

## License

See `LICENSE` for details.


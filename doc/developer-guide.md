# Third Brain Companion (TBC) — Developer Guide

> **Audience**: Framework contributors, plugin authors, and system integrators
>
> **Goal**: Explain *how TBC is built*, *why it is structured the way it is*, and *how to extend it safely*.

## 1. Conceptual Overview

Third Brain Companion (TBC) is a **framework for building durable AI companions** using:

- Plain‑text, git‑versioned records
- Explicit specifications (system, schema, methods)
- Deterministic tooling (CLI + flows)
- A plugin‑based execution model

At its core, TBC treats **knowledge, memory, and behavior as records**, and **operations as reproducible flows over those records**.

### Design Principles

- **Technology‑agnostic**: Records are Markdown + YAML; tools are replaceable
- **Composable**: Systems, schemas, and methods can be extended independently
- **Auditable**: All state lives in git
- **Agent‑first**: The system is optimized for AI agents, not just humans

## 2. High‑Level Architecture

TBC is implemented as a **monorepo** with three primary layers:

```
┌────────────────────────────┐
│        CLI (apps/)          │  ← User / Agent entry point
├────────────────────────────┤
│     Core Plugins (packages) │  ← Domain logic & orchestration
├────────────────────────────┤
│     Record Storage (FS)     │  ← Plain‑text persistence
└────────────────────────────┘
```

### Key Runtime Concepts

| Concept | Meaning |
|------|--------|
| **Vault** | System of record (git + files) |
| **Record** | Markdown / JSON entity with ID |
| **Flow** | Directed graph of operations |
| **Node** | Atomic executable step |
| **Plugin** | Bundle of nodes registered into runtime |

## 3. Repository Structure

```
apps/
  tbc-cli/              # CLI entry point and user flows
packages/
  tbc-core/             # Core system operations
  tbc-record-fs/        # File‑system based vault implementation
  tbc-generator/        # ID generation utilities
assets/
  specs/                # Embedded system specifications
  tools/                # Reserved for future tooling

doc/
  developer-guide.md
  user-guide.md
```

Each package is **independently buildable** but composed at runtime.

## 4. Build & Development Workflow

### Prerequisites

- **Bun** (required)
- **Node.js** (v18+, v22 recommended)
- **Git**

### Common Commands

```bash
bun install            # Install dependencies
bun run all:build      # Build everything
bun run cli:install    # Install tbc CLI globally
bun run all:clean      # Remove build artifacts
```

### Development Loop

```bash
bun run cli:dev
```

This rebuilds the CLI and executes it directly.

## 5. Plugin System (HAMI Framework)

TBC is built on the **HAMI framework**, which provides:

- Plugin registration
- Node discovery
- Flow execution
- Shared execution state

### Plugin Registration

```ts
const registry = new HAMIRegistrationManager();
await registry.registerPlugin(TBCCorePlugin);
await registry.registerPlugin(TBCRecordFSPlugin);
```

Each plugin contributes **named nodes** that can be composed into flows.

## 6. Core Packages

### 6.1 `@tbc-frameworx/tbc-core`

**Responsibility**: System logic, validation, initialization, and indexing.

Key node categories:

- **Lifecycle**: `init`, `validate`, `probe`, `resolve`
- **Bootstrap**: `generate-root`, `copy-assets`
- **Indexing**: `generate-dex-core`, `generate-dex-records`
- **Upgrade**: `backup-tbc`, `restore-root`, `restore-extensions`

This package *does not write files directly* — it generates record objects.

### 6.2 `@tbc-frameworx/tbc-record-fs`

**Responsibility**: Reading and writing records on disk.

Supported formats:

- `.md` with YAML frontmatter
- `.json`
- Plain text

#### Fetch Strategy

When fetching a record by ID, files are searched in this order:

1. `{id}.json`
2. `{id}.md`
3. `{id}`
4. `{id}.*`

This allows flexibility while preserving determinism.

### 6.3 `@tbc-frameworx/tbc-generator`

**Responsibility**: ID generation utilities.

Supported generators:

- **UUID v7** — globally unique, sortable
- **TSID** — UTC timestamp‑based identifiers

These are used both by the CLI and by agents.

## 7. CLI Application (`apps/tbc-cli`)

The CLI is a **thin orchestration layer** that:

- Parses user intent
- Assembles flows
- Executes them via the registry

### Commands → Flows

| Command | Flow |
|------|-----|
| `tbc init` | `InitFlow` |
| `tbc validate` | `ValidateFlow` |
| `tbc probe` | `ProbeFlow` |
| `tbc dex` | `RefreshCoreFlow`, `RefreshRecordsFlow` |
| `tbc gen` | `GenUuidFlow`, `GenTsidFlow` |

Each flow wires together nodes dynamically.

## 8. Flow Design Pattern

A **Flow** is a directed graph of nodes sharing state.

Typical pattern:

```
[resolve]
   ↓
[validate]
   ↓
[generate]
   ↓
[store]
   ↓
[log]
```

### Design Rules

- Nodes **must be pure** with respect to shared state
- File I/O should be isolated to record‑fs nodes
- Generation ≠ Persistence

This separation improves testability and extensibility.

## 9. Record & Specification System

TBC is **spec‑driven**.

Specifications themselves are records stored under:

```
assets/specs/
```

### Specification Types

- **System definitions** (e.g. Vault, TBC System)
- **Record definitions** (root, party, goal, log)
- **Method definitions** (instantiate, gather context, reflect)
- **Field definitions** (id, content)

The CLI copies these into each companion instance.

## 10. Dex (Index) Generation

Dex files are **collated, read‑optimized views** of the vault.

Examples:

- `dex/core.md` — all system definitions
- `dex/party.md` — index of party records
- `dex/goal.md` — index of goal records

### Two‑Phase Model

1. **Generate** index records (core)
2. **Store** them using record‑fs

This ensures all outputs remain first‑class records.

## 11. Extending TBC

You can extend TBC by:

1. Adding new **record definitions**
2. Adding new **method definitions**
3. Implementing new **plugins / nodes**
4. Wiring new **flows**

### Extension Location

```
tbc/extensions/
```

The root record may override this path.

## 12. Testing Strategy

For detailed, non-destructive testing procedures (including AI-assistant safety rules), see [Tester Guide](./tester-guide.md).


Currently:

- Validation is structural
- Determinism is enforced via flows
- Git history acts as audit log

**Recommended future work**:

- Node‑level unit tests
- Snapshot tests for generated records
- CLI golden‑file tests

## 13. Contributing Guidelines

- Follow existing flow patterns
- Do not mix generation and persistence
- Treat specs as canonical truth
- Prefer extending over modifying core behavior

All contributions should preserve **git‑first, agent‑first** principles.

## 14. Roadmap (Developer‑Facing)

- Pluggable storage backends
- Agent‑driven flow invocation
- Schema‑validated record evolution
- Deterministic replay of interactions

## 15. Mental Model (TL;DR)

> **TBC is not a chatbot framework.**
>
> It is a *version‑controlled cognitive operating system* where:
>
> - Records are memory
> - Specs are law
> - Flows are behavior
> - Git is truth


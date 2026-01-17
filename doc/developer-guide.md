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

TBC is implemented as a **monorepo** with modular packages that can be composed for different application types:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Applications (apps/)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │
│  │   tbc-cli       │  │   tbc-gui       │  │   tbc-server    │   │
│  │  (Command Line) │  │   (GUI App)     │  │   (REST API)    │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                   Core Packages (packages/)                       │
├───────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │ tbc-system  │  │  tbc-view   │  │ tbc-record- │  │ tbc-gener │ │
│  │             │  │             │  │     fs      │  │ ator      │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │tbc-interface│  │ tbc-kilocode│  │  tbc-goose  │  │tbc-github│  │
│  │             │  │             │  │             │  │ -copilot │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘  │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ tbc-memory  │  │tbc-activity │  │             │                 │
│  │             │  │             │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└───────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Record Storage (File System)                    │
├─────────────────────────────────────────────────────────────────┤
│  Plain-text files (.md, .json, .yaml) in git-versioned vault    │
└─────────────────────────────────────────────────────────────────┘
```

### Package Responsibilities

| Package | Responsibility | Key Components |
|---------|---------------|----------------|
| **tbc-system** | System lifecycle, validation, initialization | SysInitFlow, SysValidateFlow, probe operations |
| **tbc-view** | Index generation and dex management | RefreshCoreFlow, RefreshRecordsFlow, dex files |
| **tbc-record-fs** | File system operations for records | fetch-records, store-records, file format handling |
| **tbc-record-sqlite** | SQLite database operations for records | fetch-records, store-records, fetch-relations, store-relations |
| **tbc-generator** | ID generation utilities | UUID v7, TSID generation flows |
| **tbc-interface** | Cross-application interface flows | IntProbeFlow, IntGenericFlow, IntKilocodeFlow, IntGooseFlow, IntGitHubCopilotFlow |
| **tbc-gemini** | Gemini CLI specific operations | generate-core for Gemini CLI configuration |
| **tbc-kilocode** | Kilo Code specific operations | generate-core for Kilo Code modes |
| **tbc-goose** | Goose specific operations | generate-core for Goose hints |
| **tbc-github-copilot** | GitHub Copilot specific operations | generate-core for Copilot instructions |
| **tbc-memory** | Memory operations | extract-companion-id, extract-companion-record, companion flows, generate-stub-records, mem-stub-flow |
| **tbc-activity** | Activity operations | generate-activity-id, check-activity-state, move-activity-directory, create-activity-log-stub, act-start-flow, act-backlog-flow, act-close-flow |
| **tbc-view** | View operations (extended) | generate-dex-skills, refresh-skills-flow (in addition to existing dex operations) |
| **tbc-system** | System operations (extended) | backup-skills, restore-skill-extensions (in addition to existing operations) |

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
    tbc-system/           # System operations (initialization, validation, flows, assets)
    tbc-view/             # View operations (indexing and dex generation, flows)
    tbc-record-fs/        # File‑system based vault implementation
    tbc-generator/        # ID generation utilities and flows
    tbc-interface/        # Interface operations (flows for various tools like Kilo Code, Goose, GitHub Copilot)
    tbc-gemini/           # Gemini CLI integration operations
    tbc-kilocode/         # Kilo Code integration operations
    tbc-goose/            # Goose integration operations
    tbc-github-copilot/   # GitHub Copilot integration operations
    tbc-memory/           # Memory operations
    tbc-activity/         # Activity operations

doc/
   developer-guide.md
   user-guide.md
   tester-guide.md
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
await registry.registerPlugin(TBCSystemPlugin);
await registry.registerPlugin(TBCViewPlugin);
await registry.registerPlugin(TBCRecordFSPlugin);
await registry.registerPlugin(TBCInterfacePlugin);
```

Each plugin contributes **named nodes** that can be composed into flows.

## 6. Core Packages

### 6.1 `@tbc-frameworx/tbc-system`

**Responsibility**: System operations including initialization, validation, and lifecycle management.

Key node categories:

- **Lifecycle**: `init`, `validate`, `probe`, `resolve`
- **Bootstrap**: `generate-root`, `copy-assets`, `generate-role-definition`
- **Upgrade**: `backup-tbc`, `restore-root`, `restore-extensions`

This package *does not write files directly* — it generates record objects.

### 6.2 `@tbc-frameworx/tbc-view`

**Responsibility**: View operations including indexing and dex generation.

Key node categories:

- **Indexing**: `generate-dex-core`, `generate-dex-records`, `generate-dex-extensions`
- **Refresh**: `refresh-core`, `refresh-records`, `refresh-extensions`

This package generates and refreshes read-optimized index files.

### 6.3 `@tbc-frameworx/tbc-record-fs`

**Responsibility**: Reading and writing records on disk.

Supported formats:

- `.md` with YAML frontmatter
- `.json`
- `.yaml` / `.yml`
- Plain text

#### Fetch Strategy

When fetching a record by ID, files are searched in this order:

1. `{id}.json`
2. `{id}.md`
3. `{id}`
4. `{id}.*`

This allows flexibility while preserving determinism.

### 6.4 `@tbc-frameworx/tbc-record-sqlite`

**Responsibility**: SQLite database operations for records and relationships.

Database Schema:

- **nodes**: Core entity storage (id, collection, record_type, hash, timestamps)
- **node_attributes**: Extensible key-value metadata for nodes
- **edges**: Directed relationships between records
- **edge_attributes**: Metadata for relationships

#### Operations

- `fetch-records`: Retrieve records by IDs from SQLite database
- `fetch-all-ids`: Get all record IDs from a collection
- `store-records`: Persist records with metadata
- `fetch-relations`: Query relationships between records
- `store-relations`: Store relationship data

#### Database Selection

Operations accept a `database` parameter to select between:
- `records`: General TBC record indexing
- `meta`: System metadata and watermarks

### 6.5 `@tbc-frameworx/tbc-mint`

**Responsibility**: ID generation utilities.

Supported generators:

- **UUID v7** — globally unique, sortable
- **TSID** — UTC timestamp‑based identifiers

These are used both by the CLI and by agents.

### 6.6 `@tbc-frameworx/tbc-interface`

**Responsibility**: Interface operations for generating configurations for various AI tools.

Key flows:

- **IntProbeFlow**: Probes the environment for TBC CLI and system information
- **IntGenericFlow**: Generates generic AI assistant interface configuration
- **IntGeminiCliFlow**: Generates Gemini CLI interface configuration
- **IntKilocodeFlow**: Generates Kilo Code interface configuration
- **IntGooseFlow**: Generates Goose interface configuration
- **IntGitHubCopilotFlow**: Generates GitHub Copilot interface configuration

This package provides reusable flows that can be used by different application types (CLI, GUI, server) to expose TBC functionality to various AI tools.

### 6.7 `@tbc-frameworx/tbc-kilocode`

**Responsibility**: Kilo Code interface operations.

Key operations:

- **generate-core**: Generates Kilo Code modes configuration for the companion

### 6.8 `@tbc-frameworx/tbc-goose`

**Responsibility**: Goose interface operations.

Key operations:

- **generate-core**: Generates Goose hints configuration for the companion

### 6.9 `@tbc-frameworx/tbc-github-copilot`

**Responsibility**: GitHub Copilot interface operations.

Key operations:

- **generate-core**: Generates GitHub Copilot instructions configuration for the companion

### 6.10 `@tbc-frameworx/tbc-memory`

**Responsibility**: Memory operations for accessing and manipulating TBC records.

Key node categories:

- **Extraction**: `extract-companion-id`, `extract-companion-name`, `extract-companion-record`
- **Generation**: `generate-stub-records` for creating example records
- **Flows**: `mem-companion` flow for displaying companion information, `mem-stub` flow for creating stub records

This package provides reusable HAMINodes for memory operations that can be used across different TBC packages and applications. The nodes follow proper HAMI patterns with prep/exec/post methods for better testability and reusability.

### 6.11 `@tbc-frameworx/tbc-view` (Extended)

**Responsibility**: View operations including indexing and dex generation (extended with skills support).

Key node categories (extended):

- **Indexing**: `generate-dex-core`, `generate-dex-records`, `generate-dex-extensions`, `generate-dex-skills`
- **Refresh**: `refresh-core`, `refresh-records`, `refresh-extensions`, `refresh-skills`

This package generates and refreshes read-optimized index files, now including skills indexes.

## 7. CLI Application (`apps/tbc-cli`)

The CLI is a **thin orchestration layer** that:

- Parses user intent
- Assembles flows
- Executes them via the registry

### Commands → Flows

| Command | Flow | Location |
|------|-----|----------|
| `tbc sys init` | `SysInitFlow` | `@tbc-frameworx/tbc-system` |
| `tbc sys upgrade` | `SysUpgradeFlow` | `@tbc-frameworx/tbc-system` |
| `tbc sys validate` | `SysValidateFlow` | `@tbc-frameworx/tbc-system` |
| `tbc int probe` | `IntProbeFlow` | `@tbc-frameworx/tbc-interface` |
| `tbc int generic` | `IntGenericFlow` | `@tbc-frameworx/tbc-interface` |
| `tbc int gemini-cli` | `IntGeminiCliFlow` | `@tbc-frameworx/tbc-interface` |
| `tbc dex` | `RefreshCoreFlow`, `RefreshRecordsFlow`, `RefreshExtensionsFlow`, `RefreshSkillsFlow` | `@tbc-frameworx/tbc-view` |
| `tbc gen` | `GenUuidFlow`, `GenTsidFlow` | `@tbc-frameworx/tbc-mint` |
| `tbc int kilocode` | `IntKilocodeFlow` | `@tbc-frameworx/tbc-interface` |
| `tbc int goose` | `IntGooseFlow` | `@tbc-frameworx/tbc-interface` |
| `tbc int github-copilot` | `IntGitHubCopilotFlow` | `@tbc-frameworx/tbc-interface` |
| `tbc mem companion` | `MemCompanionFlow` | `@tbc-frameworx/tbc-memory` |
| `tbc mem stub` | `MemStubFlow` | `@tbc-frameworx/tbc-memory` |
| `tbc act start` | `ActStartFlow` | `@tbc-frameworx/tbc-activity` |
| `tbc act backlog` | `ActBacklogFlow` | `@tbc-frameworx/tbc-activity` |
| `tbc act close` | `ActCloseFlow` | `@tbc-frameworx/tbc-activity` |
| `tbc act show` | `ActShowFlow` | `@tbc-frameworx/tbc-activity` |

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

### Flow Organization

Flows are organized by domain:

- **Package flows**: Located in the package that owns the primary logic (e.g., system flows in `@tbc-frameworx/tbc-system`, generator flows in `@tbc-frameworx/tbc-mint`, interface flows in `@tbc-frameworx/tbc-interface`)
- **CLI flows**: Orchestration flows specific to CLI commands, located in `apps/tbc-cli/src/ops/`
- **Common utilities**: Shared nodes and utilities in package-specific locations (e.g., interface utilities in `@tbc-frameworx/tbc-interface`)

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

- `dex/core.md` — core system definitions (root, specs)
- `dex/extensions.md` — index of extension specifications
- `dex/skills.md` — index of skill guides
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
sys/ext/
```

The root record may override this path.

## 12. Testing Strategy

For detailed, non-destructive testing procedures (including AI-assistant safety rules), see [Tester Guide](./tester-guide.md).

In the spirit of the fast-moving project, we prioritize strategic integration tests over comprehensive unit test coverage. Integration tests validate end-to-end functionality and critical workflows, ensuring the system works as a whole.

Currently:

- Minimal integration tests for key CLI commands
- Strategic test scenarios covering core functionality
- Non-destructive testing in sandbox environments
- Validation is structural
- Determinism is enforced via flows
- Git history acts as audit log

**Recommended future work**:

- Expand integration test coverage progressively
- Node‑level unit tests (when needed for complex logic)
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


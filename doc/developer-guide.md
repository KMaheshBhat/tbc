# Third Brain Companion (TBC) — Developer Guide

> **Audience**: Framework contributors, command authors, and system integrators
>
> **Goal**: Explain *how TBC is built*, *why it is structured the way it is*, and *how to extend it safely*.

## 1. Conceptual Overview

Third Brain Companion (TBC) is a **framework for building durable AI companions** using:

- Plain‑text, git‑versioned records
- Explicit specifications (system, schema, methods)
- Deterministic tooling (CLI + services)
- A layered execution model

At its core, TBC treats **knowledge, memory, and behavior as records**, and **operations as reproducible services over those records**.

### Design Principles

- **Technology‑agnostic**: Records are Markdown + YAML; tools are replaceable
- **Composable**: Systems, schemas, and methods can be extended independently
- **Auditable**: All state lives in git
- **Agent‑first**: The system is optimized for AI agents, not just humans

## 2. High‑Level Architecture

TBC is implemented as a **monorepo** with a single application package today (`tbc-cli`). The CLI is a **layered** application: a thin command layer over an orchestrating service layer over a shared library layer.

```
+-----------------------------------------------------------------------+
|                        Command Layer                                  |
|                    apps/tbc-cli/src/commands/                         |
|                                                                       |
|   gen.ts   sys.ts   mem.ts   act.ts   int.ts   dex.ts                |
|                                                                       |
|   Pure adapters: parse arguments -> delegate -> let the service      |
|   own the I/O. A command never writes a file.                         |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                        Service Layer                                  |
|                  apps/tbc-cli/src/services/                           |
|                                                                       |
|  +--------+  +--------+  +--------+  +--------+  +-----+  +---+      |
|  |  sys   |  |  mem   |  |  act   |  |  int   |  |dex  |  |gen |      |
|  +--------+  +--------+  +--------+  +--------+  +-----+  +---+      |
|                                                                       |
|  Orchestration: validation, protocol resolution, record writes,       |
|  and every console message the user sees.                            |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                         Library Layer                                 |
|                   apps/tbc-cli/src/lib/                               |
|                                                                       |
|  fs.ts . db.ts . dex.ts . protocol.ts . validator.ts                  |
|  message.ts . mint.ts . synthesis.ts . assimilate.ts                 |
|  assets/ . assets-manifest.ts                                        |
|                                                                       |
|  Infrastructure and pure helpers. No console output of their own      |
|  beyond what a service explicitly asks them to render.                |
+-----------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                 Record Storage (File System)                          |
+-----------------------------------------------------------------------+
|  Plain-text files (.md, .json, .yaml) in git-versioned vault          |
|  Plus an optional SQLite index (records.db) for fast queries.         |
+-----------------------------------------------------------------------+
```

### The Responsibility Boundary

The three layers have a **strict** contract. Violating it is the fastest way to make TBC hard to extend:

| Layer | May do | May **not** do |
|-------|--------|-----------------|
| **Command** (`commands/`) | Parse arguments, read the **root program's** global options, delegate to a service, format an error and exit `1` | Write files, touch the database, print progress, own validation |
| **Service** (`services/`) | Orchestrate: resolve the protocol, validate the root, call the library layer, own every write and every message | Know about Commander, read `process.argv`, import a command |
| **Library** (`lib/`) | Pure data + infrastructure: read/write records, query the database, build artifacts, format messages | Print to the console on its own initiative, depend on a service |

### Service Responsibilities

| Service | Responsibility | Key entry points |
|---------|---------------|------------------|
| **sys** | System lifecycle, initialization, upgrade | `initSystem`, `upgradeSystem`, `validateSystem` |
| **validate** | Compose root validation, its audit and optional guard | `validateRoot`, `validateSystem` |
| **mem** | Memory operations — remember, recall, and assimilate (mine the FS records and bake them into every store) | `rememberMemory`, `recallMemory`, `assimilateMemory` |
| **act** | Activity lifecycle — start, show, pause, close | `startActivity`, `showActivity`, `pauseActivity`, `closeActivity` |
| **int** | Interface generation for AI tools — probe the environment, emit the agent configuration | `probeInterface`, `generateInterface` |
| **dex** | inDEX (index) generation | `rebuildDex` |
| **gen** | ID generation — UUID v7 and TSID | `generateUuids`, `generateTsids` |

### Key Runtime Concepts

| Concept | Meaning |
|--------|---------|
| **Vault** | System of record (git + files) |
| **Record** | Markdown / JSON entity with ID |
| **Service** | The unit of orchestration — one family of operations, with its own context |
| **Command** | A pure adapter that exposes one service operation on the command line |
| **Protocol** | The resolved collection layout of a vault (`sys`, `skills`, `mem`, `dex`, `act`) |
| **Source label** | The service context a message came from (`mem:recall`, `sys:upgrade:validate`) |

### Message Source Labels

A message's `source` identifies the **service context** that produced it. The rules:

1. A command's own lines carry the **request source** — `mem:remember`, `mem:recall`,
   `mem:assimilate`, `act:start`, `act:show`, `act:pause`, `act:close`,
   `dex:rebuild`, `sys:init`, `sys:upgrade`, `sys:validate`, `int:probe`,
   `int:<agent>`, `gen:uuid`, `gen:tsid`.
2. Every command service composes the validate *service*, so validation labels stack, for
   example `dex:rebuild:validate` and `mem:remember:validate`. The guard keeps the parent
   request label.
3. The `OVERWRITE-GUARD` error carries the **parent** label (the request source).
   It is distinguished by its level and its code, not by its label.

The word "flow" is retired: a **service** is the unit of orchestration.

### Validation Service

`validateRoot` is the shared service entry point. It resolves or accepts a protocol, runs the
validation library, applies the audit policy (always for `sys`; on failure or `--verbose` for
other services), and can render the caller-specific overwrite guard. `lib/validator.ts` remains
the check engine.

## 3. Repository Structure

```
apps/
   tbc-cli/
      src/
         index.ts          # the entry point — declares the root program
         commands/         # the command layer (pure adapters)
         services/         # the service layer (orchestration)
         lib/              # the library layer (infrastructure + assets)
      tests/               # the integration suite
      package.json
scripts/
   build-all.ts            # the multi-package build/test harness
doc/
   developer-guide.md
   user-guide.md
   tester-guide.md
```

Each package is **independently buildable** but composed at runtime. The build
harness (`scripts/build-all.ts`) stays **multi-package ready**: adding a second
entry point is a *re-point* — one entry in `BUILD_ORDER` and one entry in the
root `workspaces` glob — not a re-write.

## 4. Build & Development Workflow

### Prerequisites

- **Bun** (required)
- **Node.js** (v18+, v22 recommended)
- **Git**

### Common Commands

```bash
bun install                  # Install dependencies
bun run all:build            # Build everything and run the test suite
bun run cli:install          # Install tbc CLI globally
bun run node_modules:clean   # Remove installed dependencies
```

### Development Loop

```bash
bun apps/tbc-cli/src/index.ts mem remember "a thought"
```

This executes the CLI directly from source.

## 5. The Command Layer

A command is a **pure adapter**. It does three things and nothing else:

1. **Parse** — declare the sub-command and its options.
2. **Delegate** — call exactly one service function with a request object.
3. **Report** — on a thrown error, print `Error running <cmd> <sub>: <message>` and
   exit `1`.

```ts
export function createMemCommand(rootProgram: Command) {
  const cmdMem = new Command('mem')
    .description('Memory operations');

  cmdMem.addCommand(
    new Command('remember')
      .description('Persist a thought, fact, or stub to memory')
      .argument('[content]', 'The content of the memory')
      .option('-t, --type <type>', 'Record type: note (default), goal, log, party, structure', 'note')
      .action(async (content, opts) => {
        const cliOpts = rootProgram.opts();
        try {
          await rememberMemory({
            rootDirectory: cliOpts.root || process.cwd(),
            content,
            type: opts.type,
            verbose: !!cliOpts.verbose,
            source: 'mem:remember',
          });
        } catch (error) {
          handleError('Error running mem remember', error, !!cliOpts.verbose);
          process.exit(1);
        }
      })
  );

  return cmdMem;
}
```

### The Global-Option Contract

- `--verbose` and `--root <path>` are declared **once**, on the **root program**, and
  are read **only** through `rootProgram.opts()`. No intermediate command re-declares
  them.
- Because Commander leaves positional options disabled by default, the root program
  scans the entire argv for its own options. **Both** placements therefore work and
  are equivalent:

  ```bash
  tbc --root /vault mem remember "note"      # root option before the sub-command
  tbc mem remember "note" --root /vault      # root option after the sub-command
  ```

### Adding a Command

1. Add the service function (if it does not exist) in `services/`.
2. Add the adapter in `commands/`, and register it in `src/index.ts`.
3. Add an integration suite under `apps/tbc-cli/tests/`.

## 6. The Service Layer

### 6.1 `sys` — System lifecycle

**Responsibility**: initialization, validation, upgrade.

`sys` is the one service that **composes a peer service**: `sys upgrade` calls the
validate *service*, which is why its label stacks (`sys:upgrade:validate`). Its
`init` and `upgrade` seed the vault from the assets in `lib/assets/`.

### 6.2 `mem` — Memory

**Responsibility**: writing, recalling and assimilating memory records.

`mem assimilate` is the interesting one: it **mines** the filesystem memory records,
then **bakes** the derived structure into every configured store — the enriched
front-matter in the FS record, the SQLite index and its relationships, and the
inDEX artifacts — so that every store agrees with the filesystem. It is idempotent:
a second run changes nothing.

### 6.3 `act` — Activity lifecycle

**Responsibility**: the start -> show -> pause -> close lifecycle of an activity log.
`act close` archives the activity and copies its primary log into memory.

### 6.4 `int` — Interface generation

**Responsibility**: probing the environment and generating the configuration that
lets an AI tool act as the companion (`AGENTS.md`, `.gemini/GEMINI.md`,
`.kilocodemodes`, `.goosehints`, `.github/agents/...`, `.pi/SYSTEM.md`).

### 6.5 `dex` — inDEX generation

**Responsibility**: rebuilding the read-optimized index files from the vault.

### 6.6 `gen` — ID generation

**Responsibility**: UUID v7 (globally unique, sortable) and TSID (UTC timestamp-based)
identifiers.

## 7. The Library Layer

| Module | Responsibility |
|--------|---------------|
| `fs.ts` | Reading and writing records on disk (`.md` with YAML frontmatter, `.json`, `.yaml`/`.yml`) |
| `db.ts` | The SQLite index — `upsertRecord`, `rebuildCollectionIndex`, `rebuildCollectionRelations`, `searchRecords`, `queryRecords` |
| `dex.ts` | Building the inDEX artifacts |
| `protocol.ts` | Resolving a vault's collection layout from its root record |
| `validator.ts` | The root validation checks |
| `message.ts` | Every console message — the formatters, the shared validation audit, the source labels |
| `mint.ts` | UUID v7 / TSID minting |
| `synthesis.ts` | Pure builders for the records `sys init` seeds |
| `assimilate.ts` | The memory reader and the miner used by `mem assimilate` |
| `assets/` | The templates and skills copied into a vault |

### The SQLite Index

The database holds a **derived, non-authoritative** view of the vault:

- **record** — one row per record: `record_id`, `collection`, `record_kind`, `data`
  (the payload, including the body), `created_at`, `updated_at`.
- **record_relation** — the mined relationships (`mem_next:<id>:tag:<tag>`).

Two write-amplification guards keep the index honest and quiet:

- `upsertRecord` does **not** bump `updated_at` when the payload is unchanged.
- `rebuildCollectionIndex` does **not** rewrite a row whose kind and payload are
  unchanged.

The filesystem remains the source of truth; the index is always rebuildable.

## 8. Record & Specification System

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

## 9. Dex (Index) Generation

Dex files are **collated, read‑optimized views** of the vault.

Examples:

- `dex/sys.digest.txt` — the collated system specifications
- `dex/skills.jsonl` — the skills metadata index
- `dex/<mem>.*.jsonl` — the memory shards, partitioned by record_type

### Two‑Phase Model

1. **Generate** index records (core)
2. **Store** them using the FS and SQLite layers

This ensures all outputs remain first‑class records.

## 10. Extending TBC

You can extend TBC by:

1. Adding new **record definitions**
2. Adding new **method definitions**
3. Adding a new **service** (and its command adapter)
4. Extending an existing **library** helper

### Extension Location

```
sys/ext/
```

The root record may override this path.

## 11. Testing Strategy

For detailed, non-destructive testing procedures (including AI-assistant safety rules), see [Tester Guide](./tester-guide.md).

In the spirit of the fast-moving project, we prioritize strategic integration tests over comprehensive unit test coverage. Integration tests validate end-to-end functionality and critical workflows, ensuring the system works as a whole.

Currently:

- Minimal integration tests for key CLI commands
- Strategic test scenarios covering core functionality
- Non-destructive testing in sandbox environments
- Validation is structural
- Determinism is enforced by the services
- Git history acts as audit log

**Recommended future work**:

- Expand integration test coverage progressively
- Unit tests (when needed for complex logic)
- Snapshot tests for generated records
- CLI golden‑file tests

### Running the Suite

```bash
bun test ./apps/tbc-cli/tests/integration.test.ts
```

The suite writes to the single `_test/` fixture tree. **Never run two test
processes concurrently** — they share that tree.

Assert on **behaviour**, not on **labels**. A source label is a DX artefact; the
observable behaviour is the surface that matters.

## 12. Contributing Guidelines

- Keep the command / service / library boundary intact
- Do not mix generation and persistence
- Treat specs as canonical truth
- Prefer extending over modifying core behavior

All contributions should preserve **git‑first, agent‑first** principles.

## 13. Roadmap (Developer‑Facing)

- Pluggable storage backends
- A second entry point (e.g. an HTTP server) over the same services
- Schema‑validated record evolution
- Deterministic replay of interactions

## 14. Mental Model (TL;DR)

> **TBC is not a chatbot framework.**
>
> It is a *version‑controlled cognitive operating system* where:
>
> - Records are memory
> - Specs are law
> - Services are behavior
> - Git is truth

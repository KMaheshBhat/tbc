# Third Brain Companion Developer Guide

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Build System](#build-system)
- [Architecture](#architecture)
- [Plugin Architecture](#plugin-architecture)
- [Operation Flows](#operation-flows)
- [Record System](#record-system)
- [Specifications](#specifications)
- [CLI Implementation](#cli-implementation)
- [File System Operations](#file-system-operations)
- [Dependencies & Frameworks](#dependencies--frameworks)
- [Testing Strategy](#testing-strategy)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Future Enhancements](#future-enhancements)
- [Troubleshooting](#troubleshooting)

## Overview

Third Brain Companion (TBC) is a sophisticated framework for building AI companions using structured, git-based plain-text records. This guide provides technical details for developers, architects, and contributors to the TBC ecosystem.

### What is TBC?

TBC provides a technology-agnostic, portable system for conceptualizing, operating, and using AI Agent companions. It uses a git-based vault of plain-text records to store interactions, definitions, and memories, enabling collaborative AI companion development.

### Key Features

- **Portable & Technology-Agnostic**: Works across platforms and environments
- **Git-Based Storage**: Version control and collaboration for all companion data
- **Extensible Architecture**: Plugin-based system for custom operations and record types
- **Structured Records**: Markdown + YAML frontmatter for rich, parseable content
- **Automated Indexing**: Shell scripts for efficient context gathering

## Getting Started

### Prerequisites

- **Node.js**: v18+ (v22+ recommended)
- **Bun**: Latest version (for fast package management and runtime)
- **Git**: For repository operations

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd third-brain-companion
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Build all packages**:
   ```bash
   bun run all:build
   ```

4. **Install CLI globally for testing**:
   ```bash
   bun run cli:install
   ```

5. **Verify installation**:
   ```bash
   tbc --help
   ```

### Development Workflow

- Use `bun run core:build` or `bun run record-fs:build` for individual package builds
- Use `bun run cli:dev` for CLI development with hot reload
- Run tests in `/tmp` directory to avoid affecting your development environment

## Build System

### Monorepo Setup

Uses Bun workspaces for package management:

```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

### Build Commands

```bash
# Install dependencies
bun install

# Build all packages (in dependency order: record-fs → core → cli)
bun run all:build

# Build individual packages
bun run record-fs:build  # Build tbc-record-fs
bun run core:build       # Build tbc-core
bun run cli:install      # Build and install CLI globally

# Clean build artifacts
bun run all:clean
```

### TypeScript Configuration

- **Target**: ESNext
- **Module**: Preserve (for bundler)
- **Strict**: Enabled
- **Declaration**: Generated

## Architecture

### Core Components

- **Vault System**: Git-based storage with Markdown + frontmatter records
- **CLI Tool**: TypeScript/Node.js application using HAMI framework
- **Plugin System**: Extensible operations via HAMI framework plugins
- **Specifications**: Markdown-based schema definitions and extension guidelines
- **Tools**: Shell scripts for index generation and automation

### Directory Structure

```
tbc/
├── apps/tbc-cli/              # Main CLI application
│   ├── src/                   # TypeScript source code
│   │   ├── bootstrap.ts       # Plugin registration
│   │   ├── index.ts           # CLI entry point
│   │   └── ops/               # Operation flows
│   ├── assets/                # Embedded specs and tools
│   │   ├── specs/             # System specifications
│   │   └── tools/             # Shell scripts
│   └── package.json
├── packages/
│   ├── tbc-core/              # Core operations package
│   │   ├── src/
│   │   │   ├── index.ts       # Package exports
│   │   │   ├── plugin.ts      # Plugin definition
│   │   │   ├── types.ts       # Type definitions
│   │   │   └── ops/           # Core operation nodes
│   │   └── package.json
│   └── tbc-record-fs/         # Record file system operations
│       ├── src/
│       │   ├── index.ts       # Package exports
│       │   ├── plugin.ts      # Plugin definition
│       │   ├── types.ts       # Type definitions
│       │   └── ops/           # Record operation nodes
│       └── package.json
├── doc/                       # Documentation
└── package.json               # Root workspace configuration
```

## Plugin Architecture

### HAMI Framework Integration

TBC uses the HAMI framework for plugin-based workflow orchestration:

```typescript
// Plugin registration
await registry.registerPlugin(TBCCorePlugin);
await registry.registerPlugin(TBCRecordFSPlugin);
```

### Core Plugins

#### TBCCorePlugin (`@tbc-frameworx/tbc-core`)
Provides essential TBC core operations for environment management and initialization:

**Core Operations:**
- `tbc-core:probe`: System information gathering (OS, Node.js version, etc.)
- `tbc-core:init`: Directory structure creation (tbc/, vault/, dex/)
- `tbc-core:copy-assets`: Specification and tool copying from assets
- `tbc-core:generate-root`: Initial tbc/root.md generation
- `tbc-core:backup-tbc`: Creates timestamped backup of tbc/ directory
- `tbc-core:restore-extensions`: Restores extensions/ from backup during upgrades
- `tbc-core:resolve`: Working directory resolution for TBC operations
- `tbc-core:validate`: TBC directory structure validation
- `tbc-core:write-core`: Writes collated system definitions to dex/core.md
- `tbc-core:write-records`: Writes records indexes to dex/{record_type}.md files
- `tbc-core:refresh-core`: Orchestrates fetching and writing of core system definitions
- `tbc-core:refresh-records`: Orchestrates fetching and writing of all records indexes

#### TBCRecordFSPlugin (`@tbc-frameworx/tbc-record-fs`)
Provides record file system operations for data retrieval and management:

**Record Operations:**
- `tbc-record-fs:fetch-records`: Fetches records by IDs from collection directories
- `tbc-record-fs:fetch-all-ids`: Retrieves all record IDs from a collection directory

### FetchRecordsNode

The `FetchRecordsNode` provides flexible record retrieval from TBC collection directories. It supports multiple file formats and implements a priority-based file lookup system.

#### File Lookup Priority
Files are searched in this order:
1. `{id}.json` - JSON files
2. `{id}.md` - Markdown files with frontmatter
3. `{id}` - Files with no extension
4. First file matching `{id}.*` - Any extension

#### Supported File Formats

- **JSON files** (`.json`): Parsed as JSON objects
- **Markdown files** (`.md`): Frontmatter extracted as object properties, content stored in `content` field
- **Plain text files**: Content stored in `content` field

All records automatically receive an `id` field matching the requested ID.

#### Usage Example

```typescript
import { FetchRecordsNode } from '@tbc-frameworx/tbc-record-fs';

// In a flow or direct usage
const fetchNode = new FetchRecordsNode();
await fetchNode.run({
  rootDirectory: '/path/to/tbc',
  collection: 'vault',
  IDs: ['record-123', 'record-456']
});

// Results in shared.fetchResults:
// {
//   "vault": {
//     "record-123": { id: "record-123", title: "My Note", content: "..." },
//     "record-456": { id: "record-456", data: {...} }
//   }
// }
```

#### Shared State Requirements

- `shared.rootDirectory`: TBC root directory path (required)
- `shared.collection`: Collection subdirectory name (required)
- `shared.IDs`: Array of record IDs to fetch (required)

#### Output

- `shared.fetchResults`: Object mapping collection names to record ID mappings

### FetchAllIdsNode

The `FetchAllIdsNode` retrieves all record IDs from a specified collection directory by scanning for `.md` files and extracting their base names.

#### Usage Example

```typescript
import { FetchAllIdsNode } from '@tbc-frameworx/tbc-record-fs';

// In a flow or direct usage
const fetchAllIdsNode = new FetchAllIdsNode();
await fetchAllIdsNode.run({
  rootDirectory: '/path/to/tbc',
  collection: 'tbc/specs'
});

// Results in shared.allIds:
// {
//   "tbc/specs": ["20250507140104", "20250507141631", ...]
// }
```

#### Shared State Requirements

- `shared.rootDirectory`: TBC root directory path (required)
- `shared.collection`: Collection subdirectory name (required)

#### Output

- `shared.allIds`: Object mapping collection names to arrays of record IDs

### Node Registration

```typescript
const TBCCorePlugin = createPlugin(
  "@tbc-frameworx/tbc-core",
  "0.1.0",
  [
    ProbeNode,
    InitNode,
    CopyAssetsNode,
    GenerateRootNode,
    BackupTbcNode,
    RestoreExtensionsNode,
    ResolveNode,
    ValidateNode,
    WriteCoreNode
  ]
);

const TBCRecordFSPlugin = createPlugin(
  "@tbc-frameworx/tbc-record-fs",
  "0.1.0",
  [
    FetchRecordsNode,
    FetchAllIdsNode
  ]
);
```

## Operation Flows

### PocketFlow Integration

Uses PocketFlow for workflow orchestration with node-based execution:

```typescript
// Sequential flow
this.startNode
  .next(init)
  .next(copyAssets)
  .next(generateRoot)
  .next(validate);
```

### Flow Types

- **InitFlow**: `tbc-core:validate → branchNode → { normal: tbc-core:init → tbc-core:copy-assets → tbc-core:generate-root → tbc-core:validate, upgrade: tbc-core:backup-tbc → tbc-core:init → tbc-core:copy-assets → tbc-core:generate-root → tbc-core:restore-extensions → tbc-core:validate, abort: exit(1) }`
- **ProbeFlow**: `tbc-core:resolve → tbc-core:validate → tbc-core:probe`
- **ValidateFlow**: `tbc-core:resolve → tbc-core:validate`
- **RefreshCoreFlow**: `tbc-core:resolve → tbc-record-fs:fetch-all-ids (specs) → tbc-record-fs:fetch-all-ids (extensions) → tbc-record-fs:fetch-records (root) → tbc-record-fs:fetch-records (specs) → tbc-record-fs:fetch-records (extensions) → tbc-core:write-core`
- **RefreshRecordsFlow**: `tbc-core:resolve → tbc-record-fs:fetch-all-ids (vault) → tbc-record-fs:fetch-records (vault) → GroupRecordsByTypeNode → tbc-core:write-records`

### Shared State Management

TBC operations use a shared state object for inter-node communication. Key shared state properties:

**TBCCoreStorage Interface:**
- `opts`: Configuration options (verbose, etc.)
- `root`: Explicit root directory path
- `rootDirectory`: Resolved working directory
- `isValidTBCRoot`: Whether directory has valid TBC structure
- `isGitRepository`: Whether directory is a git repository
- `messages`: Array of validation/status messages
- `probeResults`: System probe information
- `initResults`: Directory creation results
- `backupTbcResults`: Backup operation results
- `refreshCoreResult`: Path to generated core.md file
- `refreshRecordsResult`: Result of records refresh operation
- `fetchResults`: Fetched records by collection and ID
- `recordsByType`: Records grouped by their record_type

## Record System

### Frontmatter Schema

All records use YAML frontmatter with standardized fields:

```yaml
---
id: unique-uuid
record_type: note|goal|party|log
record_tags: [tag1, tag2, ...]
title: Human readable title
[record-type-specific fields]
---

# Markdown Content
```

### Record Types

#### Root Record (`tbc/root.md`)
- Defines agent identity and configuration
- References core definitions and extensions

#### Vault Records
Stored in `vault/` directory:
- **Notes**: General content records
- **Goals**: Objectives with status tracking
- **Parties**: Entity definitions
- **Logs**: Event and action records

### Index Generation

#### CLI Commands
TypeScript-based automation via CLI:

- **tbc dex core**: Collates root.md + specs + extensions → `dex/core.md`
- **tbc dex records**: Indexes all record types → `dex/{record_type}.md`

#### Legacy Refresh Scripts
Shell-based automation in `tbc/tools/` (deprecated):

- **refresh-core.sh**: Collates root.md + specs + extensions → `dex/core.md`
- **refresh-party.sh**: Indexes party records → `dex/parties.md`
- **refresh-goal.sh**: Indexes goal records → `dex/goals.md`
- **refresh-all.sh**: Orchestrates all refresh operations

#### Index Structure

```bash
# dex/core.md
=== Root Record ===
[content of tbc/root.md]

=== TBC System Definitions ===
[collated specs and extensions]
```

## Specifications

### Specification Files

Located in `apps/tbc-cli/assets/specs/` with timestamped filenames:
- Method definitions (Instantiate Agent, Gather Context, Persist Memories)
- Record schemas (Root, Goal, Party, etc.)
- Extension guidelines

### Extension System

Custom extensions in `tbc/extensions/`:
- Follow specification format
- Automatically included by refresh-core.sh
- Support custom record types and methods

## CLI Implementation

### Available Commands

The TBC CLI provides the following commands:

```bash
tbc init [options]         # Initialize a new TBC companion
tbc init --upgrade         # Upgrade existing companion (with backup)
tbc probe [options]        # Check environment and system info
tbc validate [options]     # Validate companion structure
tbc dex core [options]     # Refresh the core system definitions index
tbc dex records [options]  # Refresh all records indexes (party, goal, log, etc.)
tbc --help                # Show help information
```

**Global Options:**
- `--root <path>`: Specify companion root directory
- `--verbose`: Enable verbose logging

### Commander.js Integration

```typescript
const program = new Command()
  .name('tbc')
  .description('Third Brain Companion CLI')
  .option('--verbose', 'Enable verbose logging')
  .option('--root <path>', 'Root directory path');

program
  .command('init')
  .description('Initialize a new TBC companion')
  .option('--upgrade', 'Upgrade existing companion with backup')
  .action(async (options) => {
    // Implementation
  });
```

### Bootstrap Process

```typescript
// Register plugins
await registry.registerPlugin(TBCCorePlugin);
await registry.registerPlugin(TBCRecordFSPlugin);

// Execute flows
const flow = new InitFlow();
await flow.execute(params);
```

## File System Operations

### Async File Operations

Uses Node.js `fs/promises` for all file operations:

```typescript
import { cp, mkdir, readFile, writeFile } from 'fs/promises';

// Create directories
await mkdir('tbc', { recursive: true });

// Copy assets
await cp(specsSource, specsTarget, { recursive: true });

// Generate root.md
await writeFile(rootPath, rootContent);
```

### Path Resolution

```typescript
// Resolve working directory
const workingDir = params.root || process.cwd();

// Validate structure
const isValid = tbcExists && vaultExists && dexExists;
```

## Dependencies & Frameworks

### Core Frameworks

#### HAMI Framework
TBC is built on the HAMI (Human Agent Machine Interface) framework, which provides:
- Plugin-based architecture for extensible operations
- Node-based workflow orchestration
- Type-safe operation definitions
- Shared state management between operations

#### PocketFlow
Used for workflow execution with node-based processing:
- Sequential and parallel flow execution
- Error handling and retry logic
- Flow composition and branching

### Package Dependencies

#### Runtime Dependencies
- **@hami-frameworx/core**: HAMI framework core
- **commander**: CLI command parsing and help generation
- **pocketflow**: Workflow orchestration engine
- **uuidv7**: Unique identifier generation with temporal ordering

#### Development Dependencies
- **typescript**: Type checking and compilation
- **bun**: Fast JavaScript runtime and package manager
- **@types/node**: Node.js type definitions
- **@types/bun**: Bun runtime type definitions

## Testing Strategy

### Current State
- No formal test suite implemented
- Manual testing via CLI commands
- Validation through `tbc validate`

### Recommended Testing
- Unit tests for individual nodes
- Integration tests for flows
- CLI command testing
- File system operation testing

### Testing Instructions

#### Manual Testing in /tmp Directory

To test TBC functionality without affecting your development environment:

1. **Build and Install CLI**:
   ```bash
   bun run all:build
   bun run cli:install
   ```

2. **Test in Temporary Directory**:
   ```bash
   cd /tmp

   # Test init command
   tbc init --root /tmp/tbc-test1
   cd /tmp/tbc-test1

   # Test validate command
   tbc validate

   # Test probe command
   tbc probe

   # Test upgrade (if needed)
   tbc init --upgrade --root /tmp/tbc-test1

   # Clean up
   rm -rf /tmp/tbc-test1
   ```

3. **Verify Operations**:
   - Check that `tbc/`, `vault/`, and `dex/` directories are created
   - Confirm `tbc/root.md` is generated
   - Ensure validation passes for valid TBC structures
   - Verify CLI commands work without errors

#### Automated Testing (Future)

When formal test suites are implemented:
- Use Jest or Vitest for unit and integration tests
- Mock file system operations for isolated testing
- Test CLI commands via spawned processes
- Validate plugin registration and node execution

## Deployment

### CLI Installation

```bash
# Build and install globally
bun run cli:install

# Creates symlink in PATH
# /usr/local/bin/tbc -> dist/index.js
```

### Distribution

- Single binary via Bun's compile feature
- NPM package for `tbc-core` and `tbc-record-fs`
- Embedded assets in CLI package

## Contributing

### Development Workflow

1. **Fork and clone** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature-name`
3. **Install dependencies**: `bun install`
4. **Make changes** following the code standards
5. **Build and test**: `bun run all:build` then test in `/tmp`
6. **Submit pull request** with clear description

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types without justification
- **Async/Await**: Consistent async patterns, proper error handling
- **Naming**: camelCase for variables/functions, PascalCase for classes/types
- **Documentation**: JSDoc comments for public APIs and complex logic
- **Imports**: Group by external packages, then internal modules
- **Error Handling**: Use try/catch with meaningful error messages

### Creating New Operations

#### 1. Choose the Right Package
- **tbc-core**: Core TBC functionality (environment, validation, initialization)
- **tbc-record-fs**: Record-specific file operations

#### 2. Implement the Node Class
```typescript
import { HAMINode } from "@hami-frameworx/core";
import { TBCCoreStorage } from "../types.js";

export class MyNewNode extends HAMINode<TBCCoreStorage> {
  kind(): string {
    return "tbc-core:my-operation"; // or "tbc-record-fs:my-operation"
  }

  async prep(shared: TBCCoreStorage): Promise<InputType> {
    // Prepare input parameters
  }

  async exec(params: InputType): Promise<OutputType> {
    // Execute the operation
  }

  async post(shared: TBCCoreStorage, prepRes: InputType, execRes: OutputType) {
    // Store results in shared state
  }
}
```

#### 3. Register in Plugin
Add to the appropriate plugin's node array in `plugin.ts`

#### 4. Export in Package Index
Add export to `src/index.ts`

### Extension Development

1. **Create specification** in `tbc/extensions/` following the spec format
2. **Implement functionality** as new operations or modify existing flows
3. **Update refresh scripts** if needed for indexing
4. **Test thoroughly** with `tbc validate` and manual testing

## Future Enhancements

### Potential Improvements

- **Testing Framework**: Jest or Vitest integration
- **Configuration System**: JSON/YAML config files
- **Plugin API**: Public plugin development kit
- **Web Interface**: Browser-based companion management
- **Multi-tenant Support**: Multiple companions per repository
- **Encryption**: Optional record encryption
- **Sync Protocols**: Cloud synchronization options

### Architecture Considerations

- **Performance**: Index generation optimization
- **Scalability**: Large vault handling
- **Compatibility**: Cross-platform file operations
- **Security**: File system permission handling

## Troubleshooting

### Common Development Issues

**Build Failures**: Ensure all dependencies installed with `bun install`
**Plugin Registration**: Check HAMI framework compatibility
**File Permissions**: Verify write access to target directories
**Path Resolution**: Use absolute paths for reliability

### Debugging

- Enable verbose logging: `tbc command --verbose`
- Check generated files in `dex/` directory
- Validate structure with `tbc validate`
- Review error messages and stack traces

## Project Status

### Current State
- **Core Framework**: Stable with HAMI-based plugin architecture
- **CLI Operations**: `init`, `validate`, `probe`, `dex` commands implemented
- **Record System**: Basic vault structure with Markdown + frontmatter
- **Build System**: Monorepo with Bun workspaces and sequential builds
- **Testing**: Manual testing framework, automated testing planned

### Recent Changes
- Migrated `resolve` and `validate` operations to `tbc-core` package
- Implemented sequential build system for proper dependency management
- Added comprehensive testing instructions and temporary directory testing
- Updated documentation to reflect current architecture
- Implemented `tbc dex core` CLI command replacing `refresh-core.sh` shell script
- Added `FetchAllIdsNode` and enhanced `FetchRecordsNode` for record file system operations
- Added `WriteCoreNode` for core system definitions writing and `RefreshCoreFlow` for orchestration
- Moved refresh-core orchestration logic to `tbc-core` package for reusability across interfaces
- Implemented `tbc dex records` CLI command replacing shell scripts (`refresh-party.sh`, `refresh-goal.sh`, `refresh-all.sh`)
- Added `WriteRecordsNode` with generic field extraction and `RefreshRecordsFlow` for records index generation
- Added `GroupRecordsByTypeNode` for dynamic record type grouping
- Restructured CLI to have `dex` as main command with `core` and `records` subcommands

### Known Limitations
- No formal test suite (manual testing only)
- Limited record types (basic notes, goals, parties, logs)
- No web interface or advanced features yet

This guide provides the technical foundation for understanding and contributing to the Third Brain Companion framework.
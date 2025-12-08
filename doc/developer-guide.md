# Third Brain Companion Developer Guide

## Overview

Third Brain Companion (TBC) is a sophisticated framework for building AI companions using structured, git-based plain-text records. This guide provides technical details for developers, architects, and contributors.

## Architecture

### Core Components

- **Vault System**: Git-based storage with Markdown + frontmatter records
- **CLI Tool**: TypeScript/Node.js application using HAMI framework
- **Specifications**: Markdown-based schema definitions
- **Tools**: Shell scripts for index generation and automation

### Directory Structure

```
tbc/
├── apps/tbc-cli/           # Main CLI application
│   ├── src/                # TypeScript source
│   ├── assets/             # Embedded specs and tools
│   └── package.json
├── packages/
│   ├── tbc-core/           # Core operations package
│   └── tbc-record-fs/      # Record file system operations package
├── doc/                    # Documentation
└── package.json            # Root workspace config
```

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

# Build all packages
bun run all:build

# Install CLI globally
bun run cli:install

# Clean build artifacts
bun run all:clean
```

### TypeScript Configuration

- **Target**: ESNext
- **Module**: Preserve (for bundler)
- **Strict**: Enabled
- **Declaration**: Generated

## Plugin Architecture

### HAMI Framework Integration

TBC uses the HAMI framework for plugin-based workflow orchestration:

```typescript
// Plugin registration
await registry.registerPlugin(TBCCorePlugin);
await registry.registerPlugin(TBCRecordFSPlugin);
```

### Core Plugins

#### TBCCorePlugin
Provides core operations:
- `ProbeNode`: System information gathering
- `InitNode`: Directory structure creation
- `CopyAssetsNode`: Specification and tool copying
- `GenerateRootNode`: Initial root.md generation
- `BackupTbcNode`: Creates timestamped backup of tbc/ directory
- `RestoreExtensionsNode`: Restores extensions/ from backup during upgrades

#### TBCRecordFSPlugin
Record file system operations:
- `ResolveNode`: Working directory resolution
- `ValidateNode`: Structure validation
- `FetchRecordsNode`: Fetches records by IDs from collection directories

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
    RestoreExtensionsNode
  ]
);

const TBCRecordFSPlugin = createPlugin(
  "@tbc-frameworx/tbc-record-fs",
  "0.1.0",
  [
    ResolveNode,
    ValidateNode,
    FetchRecordsNode
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

- **InitFlow**: `validate → branchNode → { normal: init → copyAssets → generateRoot → validate, upgrade: backupTbc → init → copyAssets → generateRoot → restoreExtensions → validate, abort: exit(1) }`
- **ProbeFlow**: `resolve → validate → probe`
- **ValidateFlow**: `resolve → validate`

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

#### Refresh Scripts
Shell-based automation in `tbc/tools/`:

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

## Dependencies

### Core Dependencies

- **Commander.js**: CLI command parsing
- **PocketFlow**: Workflow orchestration
- **HAMI**: Plugin framework
- **UUID**: Unique identifier generation
- **gray-matter**: Markdown frontmatter parsing (used by tbc-record-fs)

### Development Dependencies

- **TypeScript**: Type checking and compilation
- **Bun**: Fast JavaScript runtime and package manager

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

### Code Standards

- TypeScript strict mode enabled
- Consistent async/await patterns
- Error handling with try/catch
- JSDoc comments for public APIs

### Development Workflow

1. Fork and clone repository
2. Install dependencies: `bun install`
3. Make changes in feature branch
4. Build and test: `bun run all:build`
5. Submit pull request

### Extension Development

1. Create specification in `tbc/extensions/`
2. Implement corresponding functionality
3. Update refresh scripts if needed
4. Test with `tbc validate`

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

This guide provides the technical foundation for understanding and contributing to the Third Brain Companion framework.
# Third Brain Companion

A technology-agnostic, portable system for conceptualizing, operating, and using an AI Agent companion for individuals or groups. The system uses a git-based vault of plain-text records to store interactions, definitions, and memories.

## Overview

The Third Brain Companion (TBC) system provides a structured way to create and maintain AI companions. It consists of:

- **Vault System**: A record storage system using git for version control and plain-text Markdown files.
- **Definitions**: Specifications for the system schema, methods, and extensions.
- **Scripts**: Tools to refresh indexes and collate information for efficient interactions.

## Features

- Portable and technology-agnostic design
- Git-based storage for versioning and collaboration
- Extensible through definitions and extensions
- Support for multiple record types (notes, goals, parties, logs, etc.)
- Automated context gathering and memory persistence
- Reflection method for maintaining party and goal records

## Quick Start

### Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd third-brain-companion
   ```

2. Install dependencies and build:
   ```
   bun install
   bun run all:build
   bun run cli:install
   ```

3. (Optional) Install UUID v7 tool for record creation:
   ```
   curl -sS https://webi.sh/uuidv7 | sh
   source ~/.config/envman/PATH.env
   ```

### Setup Your Companion

1. Create and initialize a new companion:
   ```bash
   mkdir my-companion
   cd my-companion
   git init
   tbc init
   ```

2. Customize your companion by editing `tbc/root.md`

## Documentation

- **[User Guide](doc/user-guide.md)**: Complete guide for users including setup, CLI commands, record types, and usage patterns
- **[Developer Guide](doc/developer-guide.md)**: Technical documentation for developers, architects, and contributors

## CLI Commands

```bash
tbc init        # Initialize a new companion
tbc init --upgrade  # Upgrade existing companion (with backup)
tbc probe       # Check environment and system info
tbc validate    # Validate companion structure
tbc dex         # Refresh the core system definitions index
tbc --help      # Show help
```

Use `--root <path>` with any command to specify a companion directory.

## Contributing

See the [Developer Guide](doc/developer-guide.md) for technical contribution guidelines.

## License

See LICENSE file.

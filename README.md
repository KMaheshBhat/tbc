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

## Installation

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

## CLI Tool

The TBC CLI provides commands to validate and manage your companion setup:

```bash
# Validate current directory is a valid TBC root
tbc validate

# Validate a specific directory
tbc validate --root /path/to/companion

# Enable verbose output
tbc validate --verbose

# Show help
tbc --help
```

## Setup Your Companion

To instantiate your own Third Brain Companion:

1. Start a new git repository for your companion:
   ```
   mkdir my-companion
   cd my-companion
   git init
   ```

2. Copy the assets:
   ```
   cp -r /path/to/third-brain-companion/assets ./tbc
   ```

3. Create the vault directory:
   ```
   mkdir vault
   ```

4. Create your tbc/root.md file based on the specifications in tbc/specs/20251130163650.md. Example:
   ```
   ---
   id: root
   record_type: root
   record_tags:
     - c/agent/your-agent-name
     - c/personal/your-name
   title: Your Agent Root
   ---
   # Your Agent Root

   ## Definitions

   - Agent: Your Agent Name
   - Prime User: Your Name
   - Definitions: [core](/dex/core.md)
     - use [`refresh-core`](/tbc/tools/refresh-core.sh) if not present

   ## Agent Identity

   [Describe your agent's identity]

   ## Motivation

   [Describe motivations]

   ## Memories

   [List of memory records]
   ```

5. (Optional) Add extensions in the `tbc/extensions/` directory following the specifications.

6. Run the refresh script to generate core.md:
   ```
   ./tbc/tools/refresh-core.sh
   ```

7. Validate your setup:
   ```
   tbc validate
   ```

8. Commit your initial setup:
   ```
   git add .
   git commit -m "Initial companion setup"
   ```

## Usage

### For AI Assistants

- At the start of each interaction, gather context by reading tbc/root.md and dex/core.md
- Follow the agent identity and motivations defined in tbc/root.md
- Persist memories at the end of interactions using the vault system

### For Users

- **Validate your setup**: Use `tbc validate` to ensure your companion directory structure is correct
- **Use the scripts** to refresh indexes:
  - `./tbc/tools/refresh-core.sh`: Updates core definitions and extensions
  - `./tbc/tools/refresh-party.sh`: Indexes party records
  - `./tbc/tools/refresh-goal.sh`: Indexes goal records
  - `./tbc/tools/refresh-all.sh`: Runs all refresh scripts

- Create records in the vault/ directory following the schema in tbc/specs/
- Extend the system by adding specifications in the `tbc/extensions/` directory

## Record Types

- **Root**: Main configuration record
- **Note**: General records
- **Goal**: Objectives and targets
- **Party**: Entities involved in interactions
- **Log**: Action and event logs

## Extensions

The TBC system is designed to be extensible. You can add custom record types, methods, and schemas by placing definition files in the `tbc/extensions/` directory. The refresh-core.sh script will include these in the core.md compilation.

## Contributing

Contributions are welcome! Please see the definitions for extension guidelines.

## License

See LICENSE file.

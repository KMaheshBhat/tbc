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
- Support for multiple record types
- Automated context gathering and memory persistence

## Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd third-brain-companion
   ```

2. Install UUID v7 tool for record creation:
   ```
   curl -sS https://webi.sh/uuidv7 | sh
   source ~/.config/envman/PATH.env
   ```

## Setup Your Companion

To instantiate your own Third Brain Companion:

1. Start a new git repository for your companion:
   ```
   mkdir my-companion
   cd my-companion
   git init
   ```

2. Copy the definitions:
   ```
   cp -r /path/to/third-brain-companion/definitions ./definitions
   ```

3. Create your root.md file based on the specifications in definitions/20251130163650.md. Example:
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
     - use [`refresh-core`](/scripts/refresh-core.sh) if not present

   ## Agent Identity

   [Describe your agent's identity]

   ## Motivation

   [Describe motivations]

   ## Memories

   [List of memory records]
   ```

4. Copy the scripts:
   ```
   cp -r /path/to/third-brain-companion/scripts ./scripts
   ```

5. (Optional) Add extensions in the `extensions/` directory following the specifications.

6. Run the refresh script to generate core.md:
   ```
   ./scripts/refresh-core.sh
   ```

7. Commit your initial setup:
   ```
   git add .
   git commit -m "Initial companion setup"
   ```

## Usage

### For AI Assistants

- At the start of each interaction, gather context by reading root.md and dex/core.md
- Follow the agent identity and motivations defined in root.md
- Persist memories at the end of interactions using the vault system

### For Users

- Use the scripts to refresh indexes:
  - `./scripts/refresh-core.sh`: Updates core definitions and extensions

- Create records in the vault/ directory following the schema in definitions/
- Extend the system by adding specifications in the `extensions/` directory

## Extensions

The TBC system is designed to be extensible. You can add custom record types, methods, and schemas by placing definition files in the `extensions/` directory. The refresh-core.sh script will include these in the core.md compilation.

## Contributing

Contributions are welcome! Please see the definitions for extension guidelines.

## License

See LICENSE file.

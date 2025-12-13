# Third Brain Companion User Guide

## What is Third Brain Companion?

Third Brain Companion (TBC) is a technology-agnostic, portable system for conceptualizing, operating, and using an AI Agent companion for individuals or groups. It uses a git-based vault of plain-text records to store interactions, definitions, and memories.

The system provides a structured way to create and maintain AI companions that persist across conversations and platforms.

## Key Features

- **Portable and Technology-Agnostic**: Works across different AI platforms and tools
- **Git-Based Storage**: Version control for all companion data
- **Plain-Text Records**: Markdown files with structured frontmatter
- **Extensible Design**: Add custom record types and methods
- **Automated Context Gathering**: Efficient memory and context retrieval
- **Reflection Methods**: Maintain party and goal records over time

## Quick Start

### Prerequisites

- Node.js (for building the CLI)
- Git
- Bun (recommended for development)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd third-brain-companion
   ```

2. Install dependencies and build:
   ```bash
   bun install
   bun run all:build
   bun run cli:install
   ```

3. (Optional) Install UUID v7 tool:
   ```bash
   curl -sS https://webi.sh/uuidv7 | sh
   source ~/.config/envman/PATH.env
   ```

## Setting Up Your Companion

### Initialize a New Companion

1. Create a new directory for your companion:
   ```bash
   mkdir my-companion
   cd my-companion
   git init
   ```

2. Initialize the TBC structure with your companion details:
   ```bash
   tbc init --companion "My Companion Name" --prime "Your Name"
   ```

   This creates:
   - `tbc/` - System specifications and tools
   - `vault/` - Your records storage with party and memory records
   - `dex/` - Generated indexes

   **Options:**
   - `--companion "<name>"`: Name of your AI companion (required)
   - `--prime "<name>"`: Your name or the prime user's name (required)
   - `--upgrade`: Upgrade existing companion with backup

3. Customize your companion by editing `tbc/root.md`

### Root Record Configuration

The `tbc/root.md` file defines your agent's identity and configuration:

```yaml
---
id: root
record_type: note
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

## Agent Identity

[Describe your agent's personality, role, and characteristics]

## Motivation

[Describe what drives your agent and its goals]

## Memories

[List important memory records or reference them]
```

## CLI Commands

### Core Commands

```bash
# Initialize a new companion with custom details
tbc init --companion "My AI Assistant" --prime "John Doe"

# Initialize in a specific directory
tbc init --companion "My AI Assistant" --prime "John Doe" --root /path/to/companion

# Upgrade existing companion (backs up and refreshes assets)
tbc init --upgrade

# Probe environment and system information
tbc probe

# Validate companion structure
tbc validate

# Refresh the core system definitions index
tbc dex core

# Refresh all records indexes (party, goal, log, etc.)
tbc dex records

# Generate IDs
tbc gen uuid [--count <number>]    # Generate UUID v7 (default: 1)
tbc gen tsid [--count <number>]    # Generate timestamp ID (default: 1)

# Enable verbose output (works with all commands)
tbc init --verbose
```

### Directory Options

All commands support `--root` to specify the companion directory:
```bash
tbc validate --root /path/to/companion
```

## Record Types

### Root Record
The main configuration record (`tbc/root.md`) that defines your agent's identity and core settings.

### Note Records
General-purpose records for storing information, thoughts, or any content in the `vault/` directory.

### Goal Records
Track objectives and targets with structured metadata:
- Owner, type, status (open/achieved/abandoned)
- Progress tracking and reflection

### Party Records
Define entities involved in interactions:
- People, organizations, or AI agents
- Relationship context and history

### Log Records
Record actions, events, and interaction history for audit and memory purposes.

## Working with Records

### Creating Records

All records follow the same Markdown + frontmatter format:

```yaml
---
id: unique-id-here
record_type: note
record_tags: [tag1, tag2]
title: Human Readable Title
---

# Content Here

Your markdown content goes here...
```

### Record Storage

- Place records in the `vault/` directory
- Use descriptive filenames (e.g., `20231201-agent-reflection.md`)
- Follow consistent naming conventions

### Index Generation

Use the CLI commands to update indexes:

```bash
# Update core definitions
tbc dex core

# Update all records indexes (recommended)
tbc dex records

# Legacy shell scripts (deprecated):
# Update party records index
./tbc/tools/refresh-party.sh

# Update goal records index
./tbc/tools/refresh-goal.sh

# Update all indexes
./tbc/tools/refresh-all.sh
```

## For AI Assistants

### Context Gathering

At the start of each interaction:
1. Read `tbc/root.md` for agent identity and motivations
2. Read `dex/core.md` for system definitions and specifications
3. Reference relevant records from `vault/` as needed

### Memory Persistence

After interactions:
1. Create new records in `vault/` for important information
2. Update existing records with new insights
3. Run `tbc dex records` to update all indexes
4. Reference new records in future interactions

### Best Practices

- Always maintain the agent's defined identity and motivations
- Use structured records for important information
- Keep the vault organized and searchable
- Regularly review and update goal/party records
- Use tags consistently for categorization

## Extensions

### Adding Custom Record Types

1. Create specification files in `tbc/extensions/`
2. Follow the existing specification format
3. Run `tbc dex` to include in `dex/core.md`

### Custom Methods

Define new interaction methods by:
1. Creating method specifications
2. Placing them in `tbc/extensions/`
3. Updating the root record to reference new methods

## Troubleshooting

### Common Issues

**Command not found**: Ensure `tbc` is installed and in your PATH
**Invalid structure**: Run `tbc validate` to check your setup
**Missing indexes**: Run `tbc dex` to regenerate core system definitions

### Validation

Always validate your setup after changes:
```bash
tbc validate
```

### Getting Help

- Check the CLI help: `tbc --help`
- Validate your structure: `tbc validate`
- Probe your environment: `tbc probe`

## Advanced Usage

### Multiple Companions

Create separate directories for different companions:
```bash
mkdir work-companion personal-companion
cd work-companion && tbc init
cd ../personal-companion && tbc init
```

### Version Control

Since TBC uses git:
- Commit regularly to track changes
- Use branches for experimental configurations
- Tag important versions of your companion

### Backup and Sync

- Push to remote repositories for backup
- Pull changes across devices
- Use git features for collaboration

## Contributing

See the developer guide for technical contribution guidelines.
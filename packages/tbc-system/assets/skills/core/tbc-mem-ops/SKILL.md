---
id: tbc-mem-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Memory and Record Operations (`skills/core/tbc-mem-ops`)
specification_name: tbc-mem-ops
description: Use this skill to read/write on long-term memory and perform accelerated operations, like id(UUID, TSID) generations.
methods_supported: Persist Memories, Reflection
---
# Memory & Record Operations (`tbc-mem-ops`)

**Purpose**: Read/Write operations for the long-term memory vault (`mem/`).
**Location**: `skills/core/tbc-mem-ops/`
**Actor**: Companion / Agent

## Guide

* **Identity Access**: Use `tbc mem prime` or `tbc mem companion` with the `--show full` flag to retrieve actor details required for log headers and context setting.
```bash
$ tbc mem --help
Usage: tbc mem [options] [command]

Memory operations

Options:
  -h, --help      display help for command

Commands:
  companion       Display companion information
  prime           Display prime user information
  stub            Create stub records for various record types in memory
  help [command]  display help for command
```
```bash
$ tbc mem companion --help
Usage: tbc mem companion [options]

Display companion information

Options:
  --show <type>   What to show: id (default), name, or full
  -h, --help      display help for command
```
```bash
$ tbc mem prime --help
Usage: tbc mem prime [options]

Display prime user information

Options:
  --show <type>   What to show: id (default), name, or full
  -h, --help      display help for command
```
* **Record Creation**: Use `tbc mem stub <recordType>` to generate a new file in `mem/` with the correct TBC-compliant YAML front matter. Valid types: `party`, `goal`, `log`, `note`, `structure`.
```bash
$ tbc mem stub --help
Usage: tbc mem stub [options] <recordType>

Create a stub record for a specific record type in memory

Arguments:
  recordType  Record type to create stub for (party|goal|log|note|structure)

Options:
  -h, --help      display help for command
```
* **ID Generation**: Use `tbc gen uuid` or `tbc gen tsid` when creating cross-links or manual records to maintain unique identity invariants.
```bash
$ tbc gen --help
Usage: tbc gen [options] [command]

Generate IDs

Options:
  --root <path>         Root directory
  -c, --count <number>  Number of IDs to generate (default: "1")
  -h, --help            display help for command

Commands:
  uuid                  Generate a UUID v7
  tsid                  Generate a timestamp ID
  help [command]        display help for command
```


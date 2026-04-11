---
id: tbc-mem-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Memory and Record Operations (`skills/core/tbc-mem-ops`)
specification_name: tbc-mem-ops
description: Use this skill to persist and recall memories, generate IDs (UUID, TSID), and replicate records across storage providers.
name: tbc-mem-ops
methods_supported: Persist Memories, Recall Memories, ID Generation, Record Replication
---
# Memory & Record Operations (`tbc-mem-ops`)

**Purpose**: Read/Write operations for the long-term memory vault (`mem/`).
**Location**: `skills/core/tbc-mem-ops/`
**Actor**: Companion / Agent

## Guide

* **Persist Memory**: Use `tbc mem remember [content]` to persist a thought, fact, or note to memory.
```bash
$ tbc mem remember --help
Usage: tbc mem remember [options] [content]

Persist a thought, fact, or stub to memory

Arguments:
  content            The content of the memory

Options:
  -t, --type <type>  Record type: note (default), goal, log, party, structure
                     (default: "note")
  --title <title>    Explicit title for the record
  --tags <tags>      Comma-separated tags
  -h, --help         display help for command
```
* **Recall Memory**: Use `tbc mem recall [query]` to search and retrieve memories.
```bash
$ tbc mem recall --help
Usage: tbc mem recall [options] [query]

Recall memories or identity information

Arguments:
  query                 Search query (e.g., "companion", "prime", or a keyword)

Options:
  -t, --type <type>     Filter by record type (note, goal, log, party,
                        structure)
  -l, --limit <number>  Limit the number of results (default: 10)
  -h, --help            display help for command
```
* **Assimilate**: Use `tbc mem assimilate` to replicate memory records across all RecordStore providers.
```bash
$ tbc mem assimilate --help
Usage: tbc mem assimilate [options]

Replicate memory records across all RecordStore providers

Options:
  -h, --help  display help for command
```
* **ID Generation**: Use `tbc gen uuid` or `tbc gen tsid` when creating cross-links or manual records to maintain unique identity invariants.
```bash
$ tbc gen --help
Usage: tbc gen [options] [command]

Generate IDs

Options:
  -c, --count <number>  Number of IDs to generate (default: "1")
  -h, --help            display help for command

Commands:
  uuid                  Generate/mint IDs of UUID v7
  tsid                  Generate/mint IDs of timestamp
  help [command]        display help for command
```
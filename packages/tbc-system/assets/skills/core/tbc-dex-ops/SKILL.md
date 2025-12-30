---
id: tbc-dex-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title:  (`skills/core/tbc-dex-ops`)
specification_name: tbc-dex-ops
description: Use this skill when setting up a new interface to interact with the TBC repository.
---
# Index & View Maintenance (`tbc-dex-ops`)

**Purpose**: Refreshing non-authoritative summary views in `dex/`.
**Location**: `skills/core/tbc-dex-ops/`
**Actor**: Companion / Agent (automated)

## Guide

Run these commands to ensure the Agent's "Map of Memories" is up to date.

* Refreshes non-authoritative summary files in the `dex/` directory based on explicit paths in `root.md`.
* **System Index**: `tbc dex core` to refresh the view of system definitions.
* **Record Index**: `tbc dex records` to refresh the summary of goals, notes, and logs.
* **Extension Index**: `tbc dex extensions` to update the list of active adopted methods.

```bash
$ tbc dex --help
Usage: tbc dex [options] [command]

Refresh indexes

Options:
  --root <path>   Root directory
  -h, --help      display help for command

Commands:
  core            Refresh the core system definitions index
  records         Refresh all records indexes
  extensions      Refresh extensions index
  help [command]  display help for command
```

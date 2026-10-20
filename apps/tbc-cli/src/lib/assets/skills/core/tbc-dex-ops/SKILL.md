---
id: tbc-dex-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Index & View Maintenance (`skills/core/tbc-dex-ops`)
specification_name: tbc-dex-ops
methods_supported: Reflection, Internal Indexing
name: tbc-dex-ops
description: Use this skill to rebuild and maintain index files in the dex/ directory (such as core.md, extensions.md, skills.md, goal.md, party.md, log.md and other {record_type}.md) whenever you need to query, list, or navigate records by type. Essential for record discovery, mapping, or summary views.
---
# Index & View Maintenance (`tbc-dex-ops`)

**Purpose**: Refreshing non-authoritative summary views in `dex/`.
**Location**: `skills/core/tbc-dex-ops/`
**Actor**: Companion / Agent (automated)

## Guide

Run these commands to ensure the Agent's "Map of Memories" is up to date.

* **Rebuild Indexes**: Use `tbc dex rebuild` to refresh all indexes in the `dex/` directory based on explicit paths in `root.md`.
```bash
$ tbc dex --help
Usage: tbc dex [options] [command]

Manage inDEXes

Options:
  --root <path>   Root directory
  -h, --help      display help for command

Commands:
  rebuild         Rebuild all inDEXes
  help [command]  display help for command
```

* **Using indexes**: The various indexes can be used to quickly locate the UUID for the `mem/{UUID}.md` or `sys/{TSID}.md` record. All are generally metadata indexes except for core.md which alone is a full text collation.
    * dex/core.md - all TBC Core specifications - structure, record_types, methods - full text
    * dex/extensions.md - all TBC extension specifications - index/reference only - read from `sys/ext/{TSID}.md` as needed
    * dex/{record_type}.md - all index/reference by record_type - read full record from `mem/{UUID}.md` as needed
    * dex/skills.md - all skill index/reference - read full record from `skills/{core|ext}/{id}/SKILL.md` as needed
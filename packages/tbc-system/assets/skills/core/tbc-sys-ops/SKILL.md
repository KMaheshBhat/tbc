---
id: tbc-sys-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: System Stewardship (`skills/core/tbc-sys-ops`)
specification_name: tbc-sys-ops
description: Use this skill to maintain the structural integrity of the TBC.  Generally executed by Prime User.
---
# System Stewardship (`tbc-sys-ops`)

**Purpose**: Execute the normative lifecycle of the TBC System Instance.
**Location**: `skills/core/tbc-sys-ops/`
**Actor**: Prime User (primarily) / Companion (for maintenance)

## Guide

Use this skill to maintain the structural integrity of the TBC.

* **Initialization**: Run `tbc sys init` to establish the root identity (`sys/root.md`) and actor identifiers (`prime.id`, `companion.id`).
```bash
$ tbc sys init --help
Usage: tbc sys init [options]

Initialize a new Third Brain Companion directory

Options:
  --companion <name>  Name of the AI companion
  --prime <name>      Name of the prime user (group)
  -h, --help          display help for command
```
* **Health Check**: Run `tbc sys validate` to ensure the core directory structure (`mem`, `act`, `sys`, `dex`, `skills`) is intact.
* **Upgrading**: Run `tbc sys upgrade` to refresh `sys/core/` and `skills/core/`. This preserves your manual configurations in `sys/ext/` and `skills/ext/`.
```bash
$ tbc sys upgrade --help
Usage: tbc sys upgrade [options]

Upgrade an existing Third Brain Companion directory

Options:
  -h, --help          display help for command
```


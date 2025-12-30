---
id: tbc-env-probe
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Environment Awareness (`skills/core/tbc-env-probe`)
specification_name: tbc-env-probe
description: Use this skill upon instantiation or "Ejection" to orient the Companion to the host system.
methods_supported: Gather Context, Eject Kernel
---
# Environment Awareness (`tbc-env-probe`)

**Purpose**: Contextual probing of the local execution environment.
**Location**: `skills/core/tbc-env-probe/`
**Actor**: Companion / Agent

## Guide

Use this skill upon instantiation or "Ejection" to orient the Companion to the host system.

* **Environment Snapshot**: Run `tbc int probe` to retrieve TBC version, Git status, Node version, OS details, and current timestamps.
    * Provides general environment and system information including TBC CLI version, root directory validation, Git repository status, Node.js version, user and host details, system uptime, timestamps, OS information, and shell details.
* **Application**: Use this data to populate the `interaction_model` and `interaction_interface` fields in activity logs.  If not available, ASK Prime User instead and avoid assuming.


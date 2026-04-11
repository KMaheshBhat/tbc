---
id: tbc-env-probe
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Environment Awareness (`skills/core/tbc-env-probe`)
specification_name: tbc-env-probe
description: Use this skill upon instantiation or "Ejection" to orient the Companion to the host system - probe environment for TBC CLI version, Git status, Node version, OS details, and system information.
methods_supported: Gather Context, Eject Kernel
---
# Environment Awareness (`tbc-env-probe`)

**Purpose**: Contextual probing of the local execution environment.
**Location**: `skills/core/tbc-env-probe/`
**Actor**: Companion / Agent

## Guide

Use this skill upon instantiation or "Ejection" to orient the Companion to the host system.

* **CLI Dependency**: Assumes TBC CLI is installed and available in the system PATH. If not available, proceed with manual environment checks using available tools.
* **Automatic Execution**: When the Prime User's intent involves diagnostic probing or environment awareness (e.g., "probe the interface", "diagnostic purpose"), immediately execute `tbc int probe` without requiring additional confirmation.
* **Environment Snapshot**: Run `tbc int probe` to retrieve TBC version, Git status, Node version, OS details, and current timestamps.
    * Provides general environment and system information including TBC CLI version, root directory validation, Git repository status, Node.js version, user and host details, system uptime, timestamps, OS information, and shell details.
* **Manual Fallback**: If `tbc int probe` is not executable, gather equivalent information manually:
    - TBC version: Read from the latest `sys/core/` specification file.
    - Git status: Execute `git status`.
    - Node.js version: Execute `node --version`.
    - OS details: Execute `uname -a`.
    - User: Execute `whoami`.
    - Uptime: execute `uptime`.
    - Timestamps: Execute `date` for local and UTC.
* **Error Handling**: If the probe command fails, report the error and suggest verifying TBC CLI installation or using manual checks.
* **Application**: Use this data to populate the `interaction_model` and `interaction_interface` fields in activity logs. If not available, ASK Prime User instead and avoid assuming.
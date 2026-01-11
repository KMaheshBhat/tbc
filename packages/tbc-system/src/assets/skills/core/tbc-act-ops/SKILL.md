---
id: tbc-act-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Activity Workspace Management (`skills/core/tbc-act-ops`)
specification_name: tbc-act-ops
description: Use this skill to maintain activity state - to stop, backlog/pause, and close activity..
methods_supported: Start Activity, Suspend Activity, Close Activity
---
# Activity Workspace Management (`tbc-act-ops`)

**Purpose**: Operational management of the short-term cognitive buffer (`act/`).
**Location**: `skills/core/tbc-act-ops/`
**Actor**: Companion / Agent

## Guide

Manage the "Current Activity" lifecycle to ensure no loss of cognitive state.

* **Start/Resume**: Use `tbc act start [uuid]` to initialize a workspace in `act/current/`. This automatically triggers context gathering.
```bash
$ tbc act start --help
Usage: tbc act start [options] [uuid]

Start a new activity or resume from backlog

Arguments:
  uuid  Activity UUID (optional, generates new if not provided)

Options:
  -h, --help  display help for command
```
* **Discovery**: Use `tbc act show` to view the status of active and backlogged sessions.
```bash
$ tbc act show --help
Usage: tbc act show [options]

Show current and backlog activities

Options:
  -h, --help  display help for command
```
* **Suspension**: Use `tbc act backlog <uuid>` to pause an activity. This moves the directory to `act/backlog/` to clear the "Current" focus without data loss.
```bash
$ tbc act backlog --help
Usage: tbc act backlog [options] <uuid>

Move activity from current to backlog

Arguments:
  uuid  Activity UUID

Options:
  -h, --help  display help for command
```
* **Finalization**: Use `tbc act close <uuid>`. This performs **Assimilation**: moving the session log to `mem/` and the workspace to `act/archive/`.
```bash
$ tbc act close --help
Usage: tbc act close [options] <uuid>

Close activity and assimilate logs to memory

Arguments:
  uuid  Activity UUID

Options:
  -h, --help  display help for command
```

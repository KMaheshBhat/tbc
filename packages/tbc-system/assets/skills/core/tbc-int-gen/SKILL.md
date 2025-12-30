---
id: tbc-int-gen
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Interface Integration (`skills/core/tbc-int-gen`)
specification_name: tbc-int-gen
description: Use this skill when setting up a new interface to interact with the TBC repository.
---
# Interface Integration (`tbc-int-gen`)

**Purpose**: Generating external configuration hooks for various AI interfaces.
**Location**: `skills/core/tbc-int-gen/`
**Actor**: Prime User

## Guide

Use this skill when setting up a new interface to interact with the TBC repository.

* **Targeting**: Run `tbc int <type>` (e.g., `goose`, `kilocode`, `gemini-cli`, `github-copilot`) to generate the specific manifest or configuration file required by that platform.
* **Customization**: These generated files allow the interface to "see" the TBC CLI and records, enabling the Agent to use TBC Skills.
* Generates interface configurations for AI assistants to operate as the TBC companion.

```bash
$ tbc int --help
Usage: tbc int [options] [command]

Interface commands

Options:
  -h, --help      display help for command

Commands:
  probe           Probe the environment for TBC CLI and system information
  generic         Generate generic AI assistant interface configuration
  gemini-cli      Generate Gemini CLI interface configuration
  kilocode        Generate Kilo Code interface configuration
  goose           Generate Goose interface configuration
  github-copilot  Generate GitHub Copilot interface configuration
  help [command]  display help for command
```
# Third Brain Companion (TBC) — Tester Guide

> **Audience**: Human testers, QA engineers, and AI assistants executing or validating TBC behavior
>
> **Goal**: Provide a safe, repeatable, and non‑destructive testing methodology for the TBC framework.
>
> **Key Constraint**: Tests must **never corrupt the TBC repository itself**.

## 1. Why a Separate Tester Guide Exists

TBC testing has a unique constraint:

- The **repository is itself a valid TBC root**
- The CLI performs **destructive file operations** (`init`, `upgrade`, `copy-assets`)
- AI assistants often:
  - Ignore `/tmp`
  - Execute commands in the repo root
  - Re‑run commands repeatedly

This guide exists to **prevent self‑corruption** of the repository while still allowing realistic end‑to‑end testing.

## 2. Core Testing Principles

### 2.1 Non‑Destructive by Default

**Rule #1**: *Never run `tbc sys init`, `tbc sys upgrade`, or `tbc dex` in the repository root.*

The repo contains:

- `apps/`
- `packages/`
- `doc/`

It is **not** intended to be mutated by the CLI.

### 2.2 Explicit Test Roots

All tests must run inside a **dedicated test directory**, referred to as the *Test Root*.

Examples:

```text
./_test/
./.tbc-test/
./sandbox/
```

Never rely on implicit current working directory.

## 3. Mandatory Test Directory Pattern

### 3.1 Recommended Structure

```
repo-root/
├── apps/
├── packages/
├── doc/
├── _test/
│   ├── fresh-init/
│   ├── upgrade/
│   ├── dex/
│   └── invalid/
```

Each subdirectory represents **one test scenario**.

### 3.2 Golden Rule for Test Execution

> **Always pass `--root` explicitly**

Correct:

```bash
tbc sys init --root "${PWD}/_test/fresh-init" --companion Tessera --prime Mahesh
tbc sys validate --root "${PWD}/_test/fresh-init"
tbc dex core --root "${PWD}/_test/fresh-init"
```

Incorrect (dangerous):

```bash
tbc sys init
tbc dex
```

## 4. Test Environment Setup

### 4.1 One‑Time Preparation

From repo root:

```bash
mkdir -p _test
```

### 4.2 Clean‑Slate Creation

For each test:

```bash
rm -rf _test/fresh-init
mkdir _test/fresh-init
cd _test/fresh-init
git init
```

This ensures **idempotent, reproducible runs**.

### 4.3 CLI Installation

Before testing CLI commands, install the TBC CLI globally:

```bash
bun run cli:install
```

This ensures you're using the built CLI rather than the development version. Use the `tbc` command for all testing.

## 5. CLI Test Matrix

### 5.1 `tbc sys init`

#### Happy Path

```bash
tbc sys init \
  --root ./_test/fresh-init \
  --companion Tessera \
  --prime "Prime User"
```

Validate:

- `sys/` directory exists
- `mem/` directory exists
- `sys/root.md` exists
- `sys/companion.id` and `sys/prime.id` exist

#### Failure Modes to Test

| Scenario | Expected Result |
|-------|----------------|
| Missing `--prime` | CLI error |
| Missing `--companion` | CLI error |
| Re‑run in same directory | Abort |

### 5.2 `tbc sys validate`

```bash
tbc sys validate --root ./_test/fresh-init
```

Expected:

- Exit code `0`
- Validation table with no errors

Test invalid cases by:

- Deleting `tbc/root.md`
- Renaming `vault/`

### 5.3 `tbc int probe`

```bash
tbc int probe --root ./_test/fresh-init
```

Validate:

- TBC CLI version
- TBC root directory and validation status
- Git repository status
- Node.js version
- User and host information
- System uptime and timestamps
- OS and platform details
- Shell information

No filesystem mutation should occur.

### 5.4 `tbc dex`

```bash
tbc dex core --root ./_test/fresh-init
tbc dex records --root ./_test/fresh-init
tbc dex extensions --root ./_test/fresh-init
```

Validate:

- `dex/core.md` created (contains root and specs, no extensions)
- `dex/*.md` files generated per record type
- `dex/extensions.md` created with extension summaries
- Files are deterministic across runs

### 5.5 `tbc gen`

```bash
tbc gen uuid --count 3
tbc gen tsid --count 2
```

Validate:

- UUID v7 format
- TSID ordering and UTC timestamps

These commands **must be safe anywhere**.

### 5.6 `tbc int`

#### Kilo Code Interface

```bash
tbc int kilocode --root ./_test/fresh-init
```

Validate:

- `.kilocodemodes` created with correct content

#### Goose Interface

```bash
tbc int goose --root ./_test/fresh-init
```

Validate:

- `.goosehints` created with correct content

#### Generic Interface

```bash
tbc int generic --root ./_test/fresh-init
```

Validate:

- `AGENTS.md` created in the repository root with the role definition content
- Content matches the standard TBC role definition for the companion

#### GitHub Copilot Interface

```bash
tbc int github-copilot --root ./_test/fresh-init
```

Validate:

- `.github/agents/{companion-slug}.agent.md` created with correct YAML frontmatter (description, tools) and role definition content
- File follows GitHub Copilot agent file format

### 5.7 `tbc mem`

#### Companion Information

```bash
tbc mem companion --root ./_test/fresh-init
```

Validate:

- Prints the companion ID (default behavior)

```bash
tbc mem companion --show name --root ./_test/fresh-init
```

Validate:

- Prints the companion name

```bash
tbc mem companion --show full --root ./_test/fresh-init
```

Validate:

- Prints the full companion party record in table format
- Contains all record fields (id, record_type, record_tags, party_type, title, content, etc.)

#### Prime User Information

```bash
tbc mem prime --root ./_test/fresh-init
```

Validate:

- Prints the prime user ID (default behavior)

```bash
tbc mem prime --show name --root ./_test/fresh-init
```

Validate:

- Prints the prime user name

```bash
tbc mem prime --show full --root ./_test/fresh-init
```

Validate:

- Prints the full prime user party record in table format
- Contains all record fields (id, record_type, record_tags, party_type, title, content, etc.)

#### Stub Record Creation

```bash
tbc mem stub party --root ./_test/fresh-init
tbc mem stub goal --root ./_test/fresh-init
tbc mem stub log --root ./_test/fresh-init
tbc mem stub note --root ./_test/fresh-init
tbc mem stub structure --root ./_test/fresh-init
```

Validate:

- Prints "Created stub record: {uuid}" where {uuid} is the generated UUID v7
- New `.md` file created in `mem/` directory with correct record structure
- Record has proper YAML frontmatter with `record_type`, `record_tags` containing `c/agent/{companion-slug}`
- Record content follows TBC specification format for the record type
- For `log` records: follows H2 structure with Context/Background, Process/Dialogue Log, and Deliverables/Outcomes sections

#### Failure Modes to Test

| Scenario | Expected Result |
|-------|----------------|
| Invalid record type | CLI error with list of valid types |
| Missing record type argument | CLI help displayed |

### 5.8 `tbc act`

#### Start Activity

```bash
tbc act start --root ./_test/fresh-init
tbc act start <uuid> --root ./_test/fresh-init
```

Validate:

- `act/current/{uuid}/` directory created
- `{uuid}.md` log file created in the directory with activity log structure
- UUID is valid v7 format

#### Backlog Activity

```bash
tbc act backlog <uuid> --root ./_test/fresh-init
```

Validate:

- `act/current/{uuid}/` moved to `act/backlog/{uuid}/`
- Directory structure preserved

#### Close Activity

```bash
tbc act close <uuid> --root ./_test/fresh-init
```

Validate:

- All `.md` files from `act/current/{uuid}/` moved to `mem/`
- `act/current/{uuid}/` moved to `act/archive/{uuid}/`

#### Show Activities

```bash
tbc act show --root ./_test/fresh-init
```

Validate:

- Prints "Current activities:" followed by list of directory names under `act/current/`
- Prints "Backlog activities:" followed by list of directory names under `act/backlog/`
- Empty lists shown as empty (no errors if directories don't exist)

#### Failure Modes to Test

| Scenario | Expected Result |
|-------|----------------|
| Start activity already in current | CLI error |
| Start activity in archive | CLI error |
| Backlog activity not in current | CLI error |
| Close activity not in current | CLI error |

## 6. Upgrade Testing

### 6.1 Setup

```bash
cp -r _test/fresh-init _test/upgrade
```

### 6.2 Run Upgrade

```bash
tbc sys upgrade --root ./_test/upgrade
```

Validate:

- `tbc/.backup-*` directory exists
- `tbc/root.md` preserved
- `extensions/` restored
- Validation passes

## 7. Filesystem Safety Checklist

Before approving a test run, confirm:

- [ ] `--root` was explicitly provided
- [ ] Repo root was not modified
- [ ] No files outside `_test/` changed
- [ ] Git working tree remains clean

Recommended check:

```bash
git status --porcelain
```

## 8. AI Assistant–Specific Rules

### 8.1 Mandatory Prompt Constraints

When instructing an AI assistant:

> ❗ **Always specify `--root ./_test/...`**
>
> ❗ **Never run `tbc sys init` or `tbc sys upgrade` without explicit flags**
>
> ❗ **Assume the repo root is read‑only**

### 8.2 Safe Default Root Pattern

If the assistant must choose a root:

```text
./_test/ai-session
```

And create it explicitly.

## 9. Regression Testing Strategy

### 9.1 Deterministic Outputs

The following should be byte‑stable across runs:

- Generated dex files
- Root record structure (excluding IDs)
- Validation messages

Use diff‑based regression checks.

### 9.2 Recommended Automation (Future)

- Snapshot tests for `dex/*.md`
- CLI golden output tests
- Git diff assertions

## 10. Common Failure Patterns

| Symptom | Cause | Fix |
|------|-----|----|
| Repo mutated | Missing `--root` | Abort + reset |
| Init aborts | Existing TBC root | Use fresh dir |
| Dex inconsistent | Partial vault | Re‑init test |

## 11. Mental Model for Testers

> **You are testing a system that edits its own universe.**
>
> Treat the repo as immutable.
>
> Every test must occur in a sandbox.

If this rule is followed, **TBC is safe to test — even by autonomous agents**.

## 12. TL;DR (Pin This)

- ❌ Never test in repo root
- ✅ Always pass `--root`
- ✅ One directory per test case
- ✅ Verify git stays clean
- ✅ Assume AI assistants will make mistakes — guard against them



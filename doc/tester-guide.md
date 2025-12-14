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

**Rule #1**: *Never run `tbc init` or `tbc dex` in the repository root.*

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
tbc init --root "${PWD}/_test/fresh-init" --companion Tessera --prime Mahesh
tbc validate --root "${PWD}/_test/fresh-init"
tbc dex core --root "${PWD}/_test/fresh-init"
```

Incorrect (dangerous):

```bash
tbc init
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
```

This ensures **idempotent, reproducible runs**.

## 5. CLI Test Matrix

### 5.1 `tbc init`

#### Happy Path

```bash
tbc init \
  --root ./_test/fresh-init \
  --companion Tessera \
  --prime "Prime User"
```

Validate:

- `tbc/` directory exists
- `vault/` directory exists
- `tbc/root.md` exists
- `tbc/companion.id` and `tbc/prime.id` exist

#### Failure Modes to Test

| Scenario | Expected Result |
|-------|----------------|
| Missing `--prime` | CLI error |
| Missing `--companion` | CLI error |
| Re‑run without `--upgrade` | Abort |

### 5.2 `tbc validate`

```bash
tbc validate --root ./_test/fresh-init
```

Expected:

- Exit code `0`
- Validation table with no errors

Test invalid cases by:

- Deleting `tbc/root.md`
- Renaming `vault/`

### 5.3 `tbc probe`

```bash
tbc probe --root ./_test/fresh-init
```

Validate:

- OS information
- Node / Bun versions
- CLI version

No filesystem mutation should occur.

### 5.4 `tbc dex`

```bash
tbc dex core --root ./_test/fresh-init
tbc dex records --root ./_test/fresh-init
```

Validate:

- `dex/core.md` created
- `dex/*.md` files generated per record type
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

## 6. Upgrade Testing

### 6.1 Setup

```bash
cp -r _test/fresh-init _test/upgrade
```

### 6.2 Run Upgrade

```bash
tbc init --upgrade --root ./_test/upgrade
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
> ❗ **Never run `tbc init` without explicit flags**
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



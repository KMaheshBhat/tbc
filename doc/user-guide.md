# Third Brain Companion (TBC) — User Guide

> **Audience**: Prime users, power users, and AI assistants operating a TBC instance
>
> **Goal**: Explain how to *use* a Third Brain Companion safely, effectively, and intentionally.

## 1. What Is a Third Brain Companion?

A **Third Brain Companion (TBC)** is a durable, portable memory and reasoning system for an AI agent (or group of agents) working with a human or group of humans.

Unlike chat history or proprietary memory systems, TBC:

- Stores everything as **plain‑text records**
- Uses **git** as the source of truth
- Separates **memory**, **identity**, and **behavior**
- Can be inspected, edited, forked, or archived at any time

You do not *talk to* TBC.

You **operate** it.

## 2. Core Concepts (Mental Model)

Understanding these concepts makes everything else obvious.

### 2.1 Vault

The **Vault** is the system of record.

- A directory of plain‑text files
- Versioned with git
- Contains all memories, definitions, and logs

If it is not in the vault, it does not exist.

### 2.2 Records

A **record** is a single unit of knowledge or memory.

Typically:

- Markdown file (`.md`)
- YAML frontmatter (metadata)
- Free‑form body (content)

Every record has an **ID** and a **type**.

### 2.3 Agent & Prime User

- **Agent**: The AI persona using the vault
- **Prime User**: The human (or group) the agent serves

The relationship between them is defined explicitly in records — not assumed.

## 3. Installation

### 3.1 Prerequisites

- **Git**
- **Bun** (recommended)
- **Node.js** (v18+)

### 3.2 Install the CLI

```bash
bun install
bun run all:build
bun run cli:install
```

Verify:

```bash
tbc --help
```

## 4. Creating Your First Companion

### 4.1 Choose a Directory

Create an **empty directory** for your companion:

```bash
mkdir my-companion
cd my-companion
git init
```

### 4.2 Initialize the Companion

```bash
tbc init --companion Tessera --prime "Mahesh"
```

This will:

- Create the `tbc/` system directory
- Create the `vault/`
- Generate the root record
- Copy system specifications

### 4.3 Validate

```bash
tbc validate
```

If validation passes, your companion is ready.

## 5. Directory Layout (After Init)

```
my-companion/
├── tbc/
│   ├── specs/            # System specifications (copied at init)
│   ├── root.md           # Core definition & identity
│   ├── companion.id
│   ├── prime.id
│   └── extensions/
├── vault/                # All records live here
├── dex/                  # Generated indexes
└── .git/
```

## 6. The Root Record (`tbc/root.md`)

The **root record** is the heart of your companion.

It defines:

- Agent identity
- Motivation
- Canonical definitions
- Entry points to memory

You should treat this file as *constitution‑level*.

### Recommended Practice

- Edit it deliberately
- Commit changes with meaningful messages
- Keep it readable by humans *and* agents

## 7. Working With Records

### 7.1 Record Types (Core)

Common record types include:

- `structure` — navigation / maps
- `party` — people, agents, teams
- `goal` — objectives and intentions
- `log` — interactions and reflections

All live under `vault/`.

### 7.2 Creating Records

Records can be created by:

- The Agent (preferred)
- The Prime User (manual editing)

When creating manually:

- Use a **UUID v7** for IDs
- Follow the relevant specification

Helper:

```bash
tbc gen uuid
```

## 8. Daily Usage Pattern

A typical interaction cycle looks like this:

1. **Gather Context**
   - Agent reads root + relevant records
2. **Interaction**
   - Conversation / reasoning occurs
3. **Persist Memories**
   - Logs, goals, parties updated
4. **Reflection (optional)**
   - Agent reconciles knowledge

The CLI supports steps 1, 3, and 4 indirectly.

## 9. Indexes (Dex)

Indexes are **read‑optimized summaries**.

### Refresh Core Definitions

```bash
tbc dex core
```

### Refresh Record Indexes

```bash
tbc dex records
```

Indexes are safe to regenerate at any time.

## 10. Upgrading a Companion

To upgrade an existing companion:

```bash
tbc init --upgrade
```

This will:

- Backup the existing `tbc/` directory
- Refresh system files
- Preserve your vault and extensions

Always commit before upgrading.

## 11. Using Git Effectively

Git is not optional — it *is* the memory layer.

Recommended workflow:

```bash
git status
git add .
git commit -m "Update goals after reflection"
```

You may:

- Branch for experiments
- Revert unwanted memories
- Audit agent behavior

## 12. Safety & Best Practices

### Do

- Commit often
- Review logs periodically
- Let the agent write first

### Avoid

- Editing indexes manually
- Deleting records without git
- Running CLI commands blindly

## 13. Working With AI Assistants

When using an AI agent with TBC:

- Always provide:
  - Root record
  - Relevant dex files
- Ask it to:
  - Justify record changes
  - Respect specifications

Treat the agent as a **junior archivist**, not an oracle.

## 14. Troubleshooting

### Validation Fails

- Run `tbc validate --verbose`
- Check directory structure

### Missing Records

- Regenerate dex files
- Check git history

### Confusing Behavior

- Review root record identity & motivation

## 15. Philosophy (Why This Works)

TBC works because:

- Memory is explicit
- State is inspectable
- History is preserved

You are not outsourcing thinking.

You are **externalizing it — safely**.

## 16. TL;DR

- TBC is a git‑based memory system
- Records are truth
- Root record is law
- CLI is a tool, not magic
- Git is your safety net



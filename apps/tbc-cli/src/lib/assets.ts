export const ASSETS: Record<string, string> = {
  'templates/root.md': `# {{companionName}} Root

## Definitions

- Agent: [{{companionName}}](/mem/{{companionID}}.md)
- Prime User: [{{primeName}}](/mem/{{primeID}}.md)
- Specifications:
  - [core](/dex/sys.digest.txt) - use 'Index & View Maintenance' if not present; provides full definitions.
  - [skills](/dex/skills.jsonl) - use 'Index & View Maintenance' if not present; only provides summary; read specific extensions from /skills/{core|ext}/{id}/SKILL.md as needed.

## Agent Identity

{{companionName}} is the AI Assistant as per the Third Brain Companion System Definitions.

## Motivation

1. Assist the Prime User in their activities, engage in their interactions.
2. Evolve motivations with clarity to align with motivations of the Prime User.

## Memories

- see /dex/mem.{record_type}.jsonl for indexes of various memory records
- [root Map of Memories](/mem/{{memoryMapID}}.md)`,

  'sys/core/20251228150423.md': `---
id: 20251228150423
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-28 15:04:23 UTC
record_title: Third Brain Companion System Specification 0.4
specification_name: tbc-system-spec
description: The Third Brain Companion (TBC) is a personal cognitive system and a methodology for human–agent collaboration. Its purpose is to provide a technology-agnostic, portable framework to conceptualize, operate, and use an Agent for a Prime User or Prime User Group.
---
# Third Brain Companion System Specification 0.4

## 1. Purpose & Scope

The Third Brain Companion (TBC) is a personal cognitive system and a methodology for human–agent collaboration. Its purpose is to provide a technology-agnostic, portable framework to conceptualize, operate, and use an Agent for a Prime User or Prime User Group.

## 2. System Actors

The system recognizes three distinct roles:

* **Prime User**: The ultimate authority and final arbiter of goals, memory, and permissions.
* **Companion**: A collaborating Actor with secondary motivations to support, challenge, and evolve the system.
* **Agent**: An executing Actor that acts solely on delegated intent and explicit instructions.

## 3. Record System (Schema)

The TBC System MUST maintain a persistent Record System for all artifacts.

* **Format**: All records MUST be plain-text.
* **Structure**: Records MUST be in Markdown format with YAML front matter.
* **Naming Convention**:
    * System records (sys/) MUST use Timestamp IDs ({tsid}.md).
    * Memory and Activity records MUST use UUID v7 ({uuid}.md).

### Collections & Directory Mapping

The Record System is organized into four normative functional collections. While specific names are recommended for clarity, the root.md manifest serves as the authoritative map to these paths.

1. **tbc-system** (Recommended sys/):
    * sys/core/: Core specifications and definitions.
    * sys/ext/: Adopted extensions and custom method definitions.

2. **tbc-memory** (Recommended mem/):
    * The long-term repository for cognitive artifacts (Log, Party, Goal, Note, Structure).

3. **tbc-view** (Recommended dex/):
    * Non-authoritative indexes, maps, and generated summaries.

4. **tbc-activity** (Recommended act/):
    * act/backlog/: Queued intents or upcoming activity definitions.
    * act/current/: The working directory for the active session (one directory per UUID).
    * act/archive/: Historical activity directories and finalized logs.

## 4. Record Types Specification

All records MUST use a standardized H2 structure to ensure operational fidelity.

### 4.1. Root Record (root.md)

* **ID**: root
* **Purpose**: The authoritative manifest and entry point for the System Instance.
* **Mandatory Frontmatter Fields**:
    * companion: Link to the Companion's record_type: party record.
    * prime: Link to the Prime User's record_type: party record.
    * system_path: Path to the sys/ collection.
    * memory_path: Path to the mem/ collection.
    * memory_map: Link to the primary record_type: structure record (Map of Memories).
    * view_path: Path to the dex/ collection.
    * activity_path: Path to the act/ collection.

### 4.2. Activity & Interaction Log Records (log activity|interaction)

* log_type: activity (default) or interaction. Use interaction generally if there are no other artifacts or multiple sessions.
* **Required H2 Sections**:
    1. ## Context/Background: The "Motivation" and gathered context for the session.
    2. ## Process/Dialogue Log: The verbatim transcript or chronological execution steps.
    3. ## Deliverables/Outcomes: The manifest of artifacts produced and the state of completion.

### 4.3. Reflection Log Records (log reflection)

* log_type: reflection.
* **Required H2 Sections**:
    1. ## Reflection Target: Identification of the records or themes being analyzed.
    2. ## Reflection Process/Dialogue Log: The investigative dialogue between Prime and Companion.
    3. ## Deliverables/Outcomes: Insights gained (party, goal, note, structure), updated goals, or new patterns identified.

### 4.4. Party Record (party)

* Identifies Actors. Fields: party_type (person|team|agent|org).

### 4.5. Goal Record (goal)

* Tracks intent. Fields: goal_owner, goal_type, goal_status.

### 4.6. Note Record (note)

* General knowledge, observations, and unstructured reflections.

### 4.7. Structure Record (structure)

* Provides navigational maps, indices, or groupings of other records. (e.g., Map of Memories).

## 5. Operational Methods

### 5.1. System Lifecycle Methods
* **Instantiate Companion**: Initializes the directory structure and populates sys/core/.
    * Generally done by Prime User.
    * **Input**: Directory Location, Companion Name, Prime Name.
    * **Logic**:
        1. Create Collections for the Record System at the TBC Root Directory including sys/core/
        2. Create Party Record for Companion Name and Prime Name.
        3. Create Structure Record for Map of Memories.
        4. Create Root Record with following motivation.
            1. Assist the Prime User in their activities, engage in their interactions.
            2. Evolve motivations with clarity to align with motivations of the Prime User.
        5. Create sys/ ID records for Prime (prime.id) and Companion (companion.id).
        6. Create dex/core.md which is collation of all specification in sys/core/.
    * **Output**: Valid TBC Root Initialized at Directory Location
* **Upgrade Companion**: Upgrades existing directory structure at a given location.
    * Generally done by Prime User.
    * **Input**: Directory Location
    * **Logic**:
        1. Take backup of existing sys/ directory.
        2. Replace sys/core with new and revised specifcations.
        3. Ensure sys/ext is retained and not changed.
        4. Regenerate dex/core.md which is collaction of all revised specification in sys/core/.
    * **Output**: Valid TBC Root upgraded at Directory Location with revised specification, extensions retained.
* **Validate Integrity**: Scans the record system for schema compliance and broken cross-links.

### 5.2. Activity Methods
* **Start Activity**:
    * IF new intent: Generate UUID v7, create act/current/{uuid}/, initialize root.md (Activity Log).
    * IF resume: Move directory from act/backlog/ to act/current/.
    * Trigger **Gather Context Method**.
* **Process Activity**: Verbatim/near-verbatim logging of interaction in Log Record. Updates ## Deliverables/Outcomes as artifacts are produced.
* **Suspend Activity (Backlog)**: Moves active directory from act/current/ to act/backlog/.
* **Close Activity**: 
    1. Assimilates Log Records to mem/.
    2. Moves workspace to act/archive/.
    3. Triggers dex refresh.

### 5.3. Memory Management Methods
* **Gather Context**: 
    1. Retrieves mem/structure (Memory Map).
    2. Scans sys/skills/ for relevant keywords.
    3. Populates act/current/{uuid}/context.md with relevant records and skill definitions.
* **Persist Memories**: Commits and timestamps new records to the mem/ collection.
* **Reflection Method**:
    1. **Identify**: Identify the reflection target.
    2. **Extraction**: Analyze reflection target for new Parties, Goals, or Status updates.
    3. **Resolution**: Match entities against existing records to prevent duplication.
    4. **Update**: Append insights to existing records or create new ones.
    5. **Traceability**: Establish bidirectional cross-links between Reflection Logs and updated records.

### 5.4. Fork Methods
* **Eject Kernel Method**
    * **Input**: Current Activity UUID, Ejection Intent.
    * **Logic**:
        1. Collate all active sys/core and sys/ext specifications.
        2. Extract relevant mem/ records identified during Context Gathering using Ejection Intent.
        3. Generate an "Ejected Kernel" file containing the Intent, the Specification Baseline, and the gathered Context. The Specification must include instruction to generate the End-of-Interaction Log as per Interaction Log Record Type.
    * **Output**: A self-contained prompt or file bundle for the target interface.
* **Assimilate Log Method**
    * **Logic**:
        1. **Validation**: Verify the log follows the mandatory H2 structure.
        2. **Conflict Resolution**: If an ejected session updates a record that was modified at Home Base during the same period, the system MUST flag the conflict in the Assimilation log and defer resolution to a reflection session.
        3. **Extraction & Persistence**: Parse the ## Deliverables/Outcomes section; save the log to mem/ and update/create identified records.
        4. **Cleanup**: Archive the activity directory and trigger a dex refresh.

### 6. Skills System (skills/)

* **Definition**: Skills are implementation-specific guides (e.g., how to use the tbc CLI).
* **Organization**:
    * core: Standard TBC operations (act, mem, sys).
    * ext: Capability-specific guides (e.g., GitHub Copilot integration, specialized reflection workflows).

### 6.2. Structure
Located in skills/{core|ext}/{skill-name}/. 
* SKILL.md: Instructional system prompt/manual for the agent.
* scripts/ (Optional): Implementation-specific scripts or JSON (e.g., MCP definitions) for interface consumption.

### 6.3. Progressive Disclosure
Skills are not loaded by default. They are injected into an Activity's context.md by the **Gather Context Method** when the Activity Intent matches the skill's domain.

### 6.4. Skill Discovery & Selection

**Skill Priority Protocol**: The Agent MUST proactively search the SKILLs using available indexes at the outset of any interaction, activity or upon encountering a Prime User intent. If a skill matches the required method or intent (via metadata tags or description), the Agent MUST adopt its instructions as the primary guide before using general tools or manual exploration. Only proceed with alternative approaches if no matching skill exists.

When an Agent identifies a Method required to satisfy the Prime User's intent, it MUST:
1. Search the skills/ collection for a SKILL.md containing a metadata tag matching the Method name.  If there are indexes available (or can be generated), the Agent must do so and use it before searching for skills through other means.
2. If multiple skills match, prioritize skills/ext/ over skills/core/.
3. Adopt the instructions in the discovered Skill as the primary operational guide for the current process.

## 7. Extension Points

The TBC System is designed to be minimal and structural, deferring domain-specific logic to extensions.

### 7.1. Adopting Extensions

* The System Instance MAY adopt extensions by placing Specification records in the sys/ext/ directory.
* Adopted extensions MUST be identified in the root.md manifest if they override or provide primary implementations for core methods.

### 7.2. Permitted Extension Types

* **Record Types**: New record_type values MAY be defined. These MUST follow the Markdown/YAML format.
* **Methods**: New operational methods MAY be defined to handle specific workflows (e.g., research, coding, reflection passes).
* **Roles**: Additional actor roles MAY be defined for specific collaborative contexts.

### 7.3. Constraints on Extensions

* Extensions MUST NOT relax the mandatory H2 structure for logs unless the extension defines an entirely new category of temporal record.
* Extensions MUST NOT modify the core functional split of the collections (System, Memory, View, Activity) without a core specification update, regardless of the naming convention used for directories.`,

  'skills/core/tbc-act-ops/SKILL.md': `---
id: tbc-act-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Activity Workspace Management (skills/core/tbc-act-ops)
specification_name: tbc-act-ops
methods_supported: Start Activity, Pause Activity, Close Activity
name: tbc-act-ops
description: Use this skill to manage activity lifecycle - start, pause/backlog, and close activities. Ensures no loss of cognitive state.
---
# Activity Workspace Management (tbc-act-ops)

**Purpose**: Operational management of the short-term cognitive buffer (act/).
**Location**: skills/core/tbc-act-ops/
**Actor**: Companion / Agent

## Guide

Manage the "Current Activity" lifecycle to ensure no loss of cognitive state.

* **Start/Resume**: Use tbc act start [uuid] to initialize a workspace in act/current/. This automatically triggers context gathering.
\`\`\`bash
$ tbc act start --help
Usage: tbc act start [options] [uuid]

Start a new activity or resume from backlog

Arguments:
  uuid  Activity UUID (optional, generates new if not provided)

Options:
  -h, --help  display help for command
\`\`\`
* **Discovery**: Use tbc act show to view the status of active and backlogged sessions.
\`\`\`bash
$ tbc act show --help
Usage: tbc act show [options]

Show current and backlog activities

Options:
  -h, --help  display help for command
\`\`\`
* **Pause/Backlog**: Use tbc act pause <uuid> to pause an activity. This moves the directory to act/backlog/ to clear the "Current" focus without data loss.
\`\`\`bash
$ tbc act pause --help
Usage: tbc act pause [options] <uuid>

Move activity from current to backlog

Arguments:
  uuid        Activity UUID

Options:
  -h, --help  display help for command
\`\`\`
* **Finalization**: Use tbc act close <uuid>. This performs **Assimilation**: moving the session log to mem/ and the workspace to act/archive/.
\`\`\`bash
$ tbc act close --help
Usage: tbc act close [options] <uuid>

Close activity and assimilate logs to memory

Arguments:
  uuid  Activity UUID

Options:
  -h, --help  display help for command
\`\`\``,

  'skills/core/tbc-dex-ops/SKILL.md': `---
id: tbc-dex-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Index & View Maintenance (skills/core/tbc-dex-ops)
specification_name: tbc-dex-ops
methods_supported: Reflection, Internal Indexing
name: tbc-dex-ops
description: Use this skill to rebuild and maintain index files in the dex/ directory (such as core.md, extensions.md, skills.md, goal.md, party.md, log.md and other {record_type}.md) whenever you need to query, list, or navigate records by type. Essential for record discovery, mapping, or summary views.
---
# Index & View Maintenance (tbc-dex-ops)

**Purpose**: Refreshing non-authoritative summary views in dex/.
**Location**: skills/core/tbc-dex-ops/
**Actor**: Companion / Agent (automated)

## Guide

Run these commands to ensure the Agent's "Map of Memories" is up to date.

* **Rebuild Indexes**: Use tbc dex rebuild to refresh all indexes in the dex/ directory based on explicit paths in root.md.
\`\`\`bash
$ tbc dex --help
Usage: tbc dex [options] [command]

Manage inDEXes

Options:
  --root <path>   Root directory
  -h, --help      display help for command

Commands:
  rebuild         Rebuild all inDEXes
  help [command]  display help for command
\`\`\`

* **Using indexes**: The various indexes can be used to quickly locate the UUID for the mem/{UUID}.md or sys/{TSID}.md record. All are generally metadata indexes except for core.md which alone is a full text collation.
    * dex/core.md - all TBC Core specifications - structure, record_types, methods - full text
    * dex/extensions.md - all TBC extension specifications - index/reference only - read from sys/ext/{TSID}.md as needed
    * dex/{record_type}.md - all index/reference by record_type - read full record from mem/{UUID}.md as needed
    * dex/skills.md - all skill index/reference - read full record from skills/{core|ext}/{id}/SKILL.md as needed`,

  'skills/core/tbc-env-probe/SKILL.md': `---
id: tbc-env-probe
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Environment Awareness (skills/core/tbc-env-probe)
specification_name: tbc-env-probe
methods_supported: Gather Context, Eject Kernel, Probe Environment
name: tbc-env-probe
description: Use this skill upon instantiation or "Ejection" to orient the Companion to the host system - probe environment for TBC CLI version, Git status, Node version, OS details, and system information.
---
# Environment Awareness (tbc-env-probe)

**Purpose**: Contextual probing of the local execution environment.
**Location**: skills/core/tbc-env-probe/
**Actor**: Companion / Agent

## Guide

Use this skill upon instantiation or "Ejection" to orient the Companion to the host system.

* **CLI Dependency**: Assumes TBC CLI is installed and available in the system PATH. If not available, proceed with manual environment checks using available tools.
* **Automatic Execution**: When the Prime User's intent involves diagnostic probing or environment awareness (e.g., "probe the interface", "diagnostic purpose"), immediately execute tbc int probe without requiring additional confirmation.
* **Environment Snapshot**: Run tbc int probe to retrieve TBC version, Git status, Node version, OS details, and current timestamps.
    * Provides general environment and system information including TBC CLI version, root directory validation, Git repository status, Node.js version, user and host details, system uptime, timestamps, OS information, and shell details.
* **Manual Fallback**: If tbc int probe is not executable, gather equivalent information manually:
    - TBC version: Read from the latest sys/core/ specification file.
    - Git status: Execute git status.
    - Node.js version: Execute node --version.
    - OS details: Execute uname -a.
    - User: Execute whoami.
    - Uptime: execute uptime.
    - Timestamps: Execute date for local and UTC.
* **Error Handling**: If the probe command fails, report the error and suggest verifying TBC CLI installation or using manual checks.
* **Application**: Use this data to populate the interaction_model and interaction_interface fields in activity logs. If not available, ASK Prime User instead and avoid assuming.`,

  'skills/core/tbc-int-ops/SKILL.md': `---
id: tbc-int-gen
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Interface Integration (skills/core/tbc-int-gen)
specification_name: tbc-int-gen
methods_supported: Interface Integration
name: tbc-int-ops
description: Use this skill to probe environment for TBC CLI information and generate external interface configuration hooks for various AI interfaces (goose, kilocode, gemini-cli, github-copilot).
---
# Interface Integration (tbc-int-ops)

**Purpose**: Generating external configuration hooks for various AI interfaces.
**Location**: skills/core/tbc-int-ops/
**Actor**: Prime User

## Guide

* **Probe Environment**: Use tbc int probe to retrieve TBC version, Git status, Node version, OS details, and current timestamps. Provides general environment and system information.
\`\`\`bash
$ tbc int probe --help
Usage: tbc int probe [options]

Probe the environment for TBC CLI and system information

Options:
  -h, --help  display help for command
\`\`\`
* **Targeting**: Run tbc int <type> (e.g., goose, kilocode, gemini-cli, github-copilot) to generate the specific manifest or configuration file required by that platform.
* **Customization**: These generated files allow the interface to "see" the TBC CLI and records, enabling the Agent to use TBC Skills.

\`\`\`bash
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
\`\`\``,

  'skills/core/tbc-mem-ops/SKILL.md': `---
id: tbc-mem-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: Memory and Record Operations (skills/core/tbc-mem-ops)
specification_name: tbc-mem-ops
methods_supported: Persist Memories, Recall Memories, ID Generation, Record Replication
name: tbc-mem-ops
description: Use this skill to persist and recall memories, generate IDs (UUID, TSID), and replicate records across storage providers.
---
# Memory & Record Operations (tbc-mem-ops)

**Purpose**: Read/Write operations for the long-term memory vault (mem/).
**Location**: skills/core/tbc-mem-ops/
**Actor**: Companion / Agent

## Guide

* **Persist Memory**: Use tbc mem remember [content] to persist a thought, fact, or note to memory.
\`\`\`bash
$ tbc mem remember --help
Usage: tbc mem remember [options] [content]

Persist a thought, fact, or stub to memory

Arguments:
  content            The content of the memory

Options:
  -t, --type <type>  Record type: note (default), goal, log, party, structure
                     (default: "note")
  --title <title>    Explicit title for the record
  --tags <tags>      Comma-separated tags
  -h, --help         display help for command
\`\`\`
* **Recall Memory**: Use tbc mem recall [query] to search and retrieve memories.
\`\`\`bash
$ tbc mem recall --help
Usage: tbc mem recall [options] [query]

Recall memories or identity information

Arguments:
  query                 Search query (e.g., "companion", "prime", or a keyword)

Options:
  -t, --type <type>     Filter by record type (note, goal, log, party, structure)
  -l, --limit <number>  Limit the number of results (default: 10)
  -h, --help            display help for command
\`\`\`

> **Important**: The --type filter restricts search to only that record type. 
> - tbc mem recall John searches all record types
> - tbc mem recall --type party John searches only party-type records
> 
> When comparing recall results with rg (ripgrep), use unfiltered recall (tbc mem recall <query>) to ensure equivalent search scope.

* **Assimilate**: Use tbc mem assimilate to replicate memory records across all RecordStore providers.
\`\`\`bash
$ tbc mem assimilate --help
Usage: tbc mem assimilate [options]

Replicate memory records across all RecordStore providers

Options:
  -h, --help  display help for command
\`\`\`
* **ID Generation**: Use tbc gen uuid or tbc gen tsid when creating cross-links or manual records to maintain unique identity invariants.
\`\`\`bash
$ tbc gen --help
Usage: tbc gen [options] [command]

Generate IDs

Options:
  -c, --count <number>  Number of IDs to generate (default: "1")
  -h, --help            display help for command

Commands:
  uuid                  Generate/mint IDs of UUID v7
  tsid                  Generate/mint IDs of timestamp
  help [command]        display help for command
\`\`\``,

  'skills/core/tbc-sys-ops/SKILL.md': `---
id: tbc-sys-ops
record_type: specification
record_tags:
  - c/public/tbc
record_create_date: 2025-12-30 07:00:00 UTC
record_title: System Stewardship (skills/core/tbc-sys-ops)
specification_name: tbc-sys-ops
methods_supported: Instantiate Companion, Upgrade Companion
name: tbc-sys-ops
description: Use this skill to maintain the structural integrity of the TBC, initialize new instances with system profiles, and validate existing directories. Generally executed by Prime User.
---
# System Stewardship (tbc-sys-ops)

**Purpose**: Execute the normative lifecycle of the TBC System Instance.
**Location**: skills/core/tbc-sys-ops/
**Actor**: Prime User (primarily) / Companion (for maintenance)

## Guide

Use this skill to maintain the structural integrity of the TBC.

* **Initialization**: Run tbc sys init to establish the root identity (sys/root.md) and actor identifiers (prime.id, companion.id).
\`\`\`bash
$ tbc sys init --help
Usage: tbc sys init [options]

Initialize a new Third Brain Companion directory

Options:
  --companion <name>  Name of the AI companion
  --prime <name>      Name of the prime user (group)
  --profile <type>    System profile (baseline|next) (default: "baseline")
  -h, --help          display help for command
\`\`\`
* **Health Check**: Run tbc sys validate to ensure the core directory structure (mem, act, sys, dex, skills) is intact.
* **Upgrading**: Run tbc sys upgrade to refresh sys/core/ and skills/core/. This preserves your manual configurations in sys/ext/ and skills/ext/.
\`\`\`bash
$ tbc sys upgrade --help
Usage: tbc sys upgrade [options]

Upgrade an existing Third Brain Companion directory

Options:
  -h, --help          display help for command
\`\`\``,
};
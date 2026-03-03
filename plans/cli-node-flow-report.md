# TBC CLI Command Execution Report

This report documents every named node and flow being executed (including branches) when each command-sub-command is run in the Third Brain Companion CLI.

---

## Table of Contents

1. [System Commands (`tbc sys ...`)](#tbc-sys-)
   - [`tbc sys init`](#tbc-sys-init)
   - [`tbc sys upgrade`](#tbc-sys-upgrade)
   - [`tbc sys validate`](#tbc-sys-validate)
2. [Generate Commands (`tbc gen ...`)](#tbc-gen-)
   - [`tbc gen uuid`](#tbc-gen-uuid)
   - [`tbc gen tsid`](#tbc-gen-tsid)
3. [Index Commands (`tbc dex ...`)](#tbc-dex-)
   - [`tbc dex rebuild`](#tbc-dex-rebuild)
4. [Memory Commands (`tbc mem ...`)](#tbc-mem-)
   - [`tbc mem remember`](#tbc-mem-remember)
   - [`tbc mem recall`](#tbc-mem-recall)
5. [Activity Commands (`tbc act ...`)](#tbc-act-)
   - [`tbc act start`](#tbc-act-start)
   - [`tbc act show`](#tbc-act-show)
   - [`tbc act pause`](#tbc-act-pause)
   - [`tbc act close`](#tbc-act-close)
6. [Interface Commands (`tbc int ...`)](#tbc-int-)
   - [`tbc int probe`](#tbc-int-probe)
   - [`tbc int generic`](#tbc-int-generic)
   - [`tbc int gemini-cli`](#tbc-int-gemini-cli)
   - [`tbc int goose`](#tbc-int-goose)
   - [`tbc int github-copilot`](#tbc-int-github-copilot)
   - [`tbc int kilocode`](#tbc-int-kilocode)

---

## Common Shared Nodes

The following nodes are used across multiple commands:

### Core Nodes
- `core:mutate` - Generic mutation node for state changes
- `core:branch` - Branching node for conditional execution
- `core:assign` - Assignment node for copying values

### System Nodes (tbc-system)
- `tbc-system:prepare-messages` - Initializes message staging
- `tbc-system:log-and-clear-messages` - Outputs and clears staged messages
- `tbc-system:resolve-root-directory` - Resolves the TBC root directory
- `tbc-system:validate-flow` - Validates TBC root directory
- `tbc-system:resolve-protocol` - Resolves protocol from root.md
- `tbc-system:prepare-records-manifest` - Prepares records manifest
- `tbc-system:add-manifest-messages` - Adds manifest info to messages
- `tbc-system:add-minted-messages` - Adds minted IDs to messages
- `tbc-system:add-identity-messages` - Adds identity info to messages
- `tbc-system:load-system-assets` - Loads system assets (specs and skills)
- `tbc-system:validate-system` - Validates system records
- `tbc-system:probe` - Probes environment for TBC CLI and system info

### Mint Nodes (tbc-mint)
- `tbc-mint:mint-ids-flow` - Flow for minting IDs (UUIDs or TSIDs)
- `tbc-mint:uuid-mint` - Node for minting UUIDs
- `tbc-mint:tsid-mint` - Node for minting TSIDs

### Record Nodes (tbc-record)
- `tbc-record:query-records-flow` - Flow for querying records
- `tbc-record:fetch-records-flow` - Flow for fetching records
- `tbc-record:store-records-flow` - Flow for storing records

### Write Nodes (tbc-write)
- `tbc-write:write-records-flow` - Flow for writing records with optional indexing

### Synthesize Nodes (tbc-synthesize)
- `tbc-synthesize:synthesize-record-flow` - Flow for synthesizing records
- `tbc-synthesize:synthesize-value-flow` - Flow for synthesizing values

### View Nodes (tbc-view)
- `tbc-view:view-records-flow` - Flow for viewing/recalling records

### Dex Nodes (tbc-dex)
- `tbc-dex:discover-records-flow` - Flow for discovering records via index
- `tbc-dex:collate-digest` - Node for collating digest
- `tbc-dex:collate-metadata-index` - Node for collating metadata index
- `tbc-dex:sync-incremental-index` - Node for syncing incremental index

### System Synthesis Nodes
- `tbc-system:synthesize-mem-records` - Synthesizes memory records
- `tbc-system:synthesize-sys-records` - Synthesizes system records
- `tbc-system:synthesize-record` - Synthesizes a single record
- `tbc-system:synthesize-value` - Synthesizes a value
- `tbc-system:synthesize-collation-digest` - Synthesizes collation digest
- `tbc-system:synthesize-collation-metadata` - Synthesizes collation metadata

---

## `tbc sys init`

**Flow**: `tbc-system:init-flow`

### Execution Path

1. **Start Node**: `tbc-system:init-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:log-and-clear-messages`
5. `core:mutate` (log "Checking first...")
6. `tbc-system:validate-flow`

#### Branch: Overwrite Guard (conditional)
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (error message) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

7. `core:mutate` (log "no existing valid TBC root found")
8. `tbc-mint:mint-ids-flow` - Mints:
   - `tbc-mint:uuid-mint` (companionID)
   - `tbc-mint:uuid-mint` (primeID)
   - `tbc-mint:uuid-mint` (memoryMapID)
9. `tbc-system:add-minted-messages`
10. `tbc-system:synthesize-mem-records`
11. `tbc-system:load-system-assets`
12. `tbc-system:synthesize-sys-records`
13. `tbc-system:log-and-clear-messages`
14. `tbc-system:prepare-records-manifest`
15. `tbc-system:add-manifest-messages`

#### Write sys Collection
16. `core:mutate` (stageRecords for sys collection)
17. `tbc-write:write-records-flow` (sys collection)
18. `core:mutate` (stageRecords for sys/core)
19. `tbc-write:write-records-flow` (sys/core collection)
20. `core:mutate` (stageRecords for sys/ext)
21. `tbc-write:write-records-flow` (sys/ext collection)
22. `core:mutate` (stageRecords for skills/core)
23. `tbc-write:write-records-flow` (skills/core collection)
24. `core:mutate` (stageRecords for skills/ext)
25. `tbc-write:write-records-flow` (skills/ext collection)
26. `core:mutate` (stageRecords for mem collection)
27. `tbc-write:write-records-flow` (mem collection, with syncIndex)

#### Branch: Validate Again (conditional)
28. `core:mutate` (log "Validating again...")
29. `tbc-system:validate-flow`
30. `core:branch` - Checks if `validationResult.success`
    - **If abort**: `core:mutate` (FAILED-INITIALIZE error) → `tbc-system:log-and-clear-messages`
    - **If default**: Continue

31. `core:mutate` (log companion/prime/map info)
32. `tbc-synthesize:synthesize-record-flow` (digest + metadata-index)
33. `tbc-write:write-records-flow` (dex collection)
34. `tbc-system:log-and-clear-messages`

---

## `tbc sys upgrade`

**Flow**: `tbc-system:upgrade-flow`

### Execution Path

1. **Start Node**: `tbc-system:upgrade-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:log-and-clear-messages`
5. `core:mutate` (log "Checking first...")
6. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

7. `core:mutate` (log "existing valid TBC root found")

#### Backup Sequences (multiple iterations)
8. `core:mutate` (prepare backup: sys)
9. `tbc-record:store-records-flow` (backup sys)
10. `core:mutate` (prepare backup: sys/core)
11. `tbc-record:store-records-flow` (backup sys/core)
12. `core:mutate` (prepare backup: sys/ext)
13. `tbc-record:store-records-flow` (backup sys/ext)
14. `core:mutate` (prepare backup: skills)
15. `tbc-record:store-records-flow` (backup skills)

#### Delete Old Specifications
16. `tbc-system:delete-directory` (sys/core)
17. `tbc-system:delete-directory` (skills/core)
18. `tbc-system:load-system-assets`
19. `tbc-system:log-and-clear-messages`
20. `tbc-system:prepare-records-manifest`
21. `tbc-system:add-manifest-messages`

#### Write New Assets
22. `core:mutate` (stageRecords for sys/core)
23. `tbc-write:write-records-flow` (sys/core)
24. `core:mutate` (stageRecords for skills/core)
25. `tbc-write:write-records-flow` (skills/core)
26. `tbc-system:log-and-clear-messages`

#### Validate Again
27. `core:mutate` (log "Validating again...")
28. `tbc-system:validate-flow`

#### Build Indexes
29. `tbc-dex:collate-digest`
30. `tbc-dex:collate-metadata-index`
31. `core:mutate` (prepare dex records)
32. `tbc-record:store-records-flow` (store dex records)
33. `tbc-system:log-and-clear-messages`

---

## `tbc sys validate`

**Flow**: `tbc-system:validate-flow`

### Execution Path

1. **Start Node**: `tbc-system:validate-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`

#### Branch: Resolve Protocol (conditional)
- `tbc-system:resolve-protocol` (if resolveProtocol=true)
- Or `new Node()` (skip if resolveProtocol=false)

4. `core:mutate` (update protocol collections)
5. `core:assign` (setup record query)

#### Query sys Collection
6. `tbc-record:query-records-flow` (sys)
7. `core:assign` (store IDs)
8. `tbc-record:fetch-records-flow` (sys)

#### Query sys/core Collection
9. `core:assign` (setup query for sys/core)
10. `tbc-record:query-records-flow` (sys/core)
11. `core:assign` (store IDs)
12. `tbc-record:fetch-records-flow` (sys/core)

#### Query sys/ext Collection
13. `core:assign` (setup query for sys/ext)
14. `tbc-record:query-records-flow` (sys/ext)
15. `core:assign` (store IDs)
16. `tbc-record:fetch-records-flow` (sys/ext)

#### Query skills Collection
17. `core:assign` (setup query for skills, recursive)
18. `tbc-record:query-records-flow` (skills)
19. `core:assign` (store IDs)
20. `tbc-record:fetch-records-flow` (skills)

#### Query mem Collection
21. `core:assign` (setup query for mem)
22. `tbc-system:prepare-records-manifest`
23. `core:mutate` (identify companionID, primeID, memoryMapID)
24. `core:mutate` (log IDs)
25. `tbc-record:fetch-records-flow` (fetch companion, prime, memoryMap)
26. `core:mutate` (store records, manifest)
27. `core:mutate` (log "Validating system")
28. `tbc-system:validate-system`
29. `tbc-system:log-and-clear-messages`

---

## `tbc gen uuid`

**Flow**: `tbc-system:generate-uuids-flow`

### Execution Path

1. **Start Node**: `tbc-system:generate-uuids-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-mint:mint-ids-flow` - Mints UUIDs based on count
   - `tbc-mint:uuid-mint` (repeated based on count)
4. `tbc-system:add-minted-messages`
5. `tbc-system:log-and-clear-messages`

---

## `tbc gen tsid`

**Flow**: `tbc-system:generate-tsids-flow`

### Execution Path

1. **Start Node**: `tbc-system:generate-tsids-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-mint:mint-ids-flow` - Mints TSIDs based on count
   - `tbc-mint:tsid-mint` (repeated based on count)
4. `tbc-system:add-minted-messages`
5. `tbc-system:log-and-clear-messages`

---

## `tbc dex rebuild`

**Flow**: `tbc-system:dex-rebuild-flow`

### Execution Path

1. **Start Node**: `tbc-system:dex-rebuild-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:log-and-clear-messages`
5. `core:mutate` (log "Checking first...")
6. `tbc-system:validate-flow`

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

7. `core:mutate` (log "existing valid TBC root found" + clear mem)

#### Query mem Collection (First Pass)
8. `core:assign` (setup query for mem)
9. `tbc-record:query-records-flow` (mem)
10. `core:assign` (store IDs)
11. `tbc-record:fetch-records-flow` (mem)

#### Query mem Collection (Second Pass)
12. `core:assign` (setup query for mem again)
13. `tbc-record:query-records-flow` (mem)
14. `tbc-system:prepare-records-manifest`
15. `tbc-system:add-manifest-messages`
16. `tbc-system:log-and-clear-messages`

#### Build Indexes
17. `tbc-dex:collate-digest` (sys.digest.txt)
18. `tbc-dex:collate-metadata-index` (skills.jsonl)
19. `tbc-dex:collate-metadata-index` (memory.jsonl)
20. `core:mutate` (prepare dex records)
21. `tbc-record:store-records-flow` (store dex records)
22. `tbc-system:log-and-clear-messages`

---

## `tbc mem remember`

**Flow**: `tbc-memory:remember-flow`

### Execution Path

1. **Start Node**: `tbc-memory:remember-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `core:mutate` (log "Checking first...")
5. `tbc-system:log-and-clear-messages`
6. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

7. `core:mutate` (log "existing valid TBC root found")
8. `tbc-system:log-and-clear-messages`

#### Mint ID
9. `core:mutate` (setup mint request)
10. `tbc-mint:mint-ids-flow` (mint ID)

#### Load Assets and Synthesize
11. `tbc-system:load-system-assets`
12. `core:mutate` (setup synthesize request)
13. `tbc-synthesize:synthesize-record-flow` (synthesize memory record)

#### Persist
14. `tbc-write:write-records-flow` (mem collection, with syncIndex)

#### Feedback
15. `core:mutate` (log success message)
16. `tbc-system:log-and-clear-messages`

---

## `tbc mem recall`

**Flow**: `tbc-memory:recall-flow`

### Execution Path

1. **Start Node**: `tbc-memory:recall-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

#### Branch: Router for Query Type
5. `core:branch` - Routes based on query
   - **If "companion" or "who am i"**: Companion Identity Sequence
   - **If "prime" or "who is my prime"**: Prime Identity Sequence
   - **If "continue" (default)**: Search Sequence

##### Companion Identity Sequence
- `tbc-system:add-identity-messages` (companion)
- `core:mutate` (log identity info)
- `tbc-system:log-and-clear-messages`

##### Prime Identity Sequence
- `tbc-system:add-identity-messages` (prime)
- `core:mutate` (log identity info)
- `tbc-system:log-and-clear-messages`

##### Search Sequence
6. `core:mutate` (setup view query)
7. `tbc-view:view-records-flow` (search memories)
   - `tbc-dex:discover-records-flow`
   - `tbc-record:fetch-records-flow`
8. `tbc-memory:add-recall-messages`
9. `core:mutate` (log search results)
10. `tbc-system:log-and-clear-messages`

---

## `tbc act start`

**Flow**: `tbc-activity:act-start-flow`

### Execution Path

1. **Start Node**: `tbc-activity:act-start-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `core:mutate` (log "Checking first...")
5. `tbc-system:log-and-clear-messages`
6. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

7. `core:mutate` (log "existing valid TBC root found")
8. `tbc-system:log-and-clear-messages`

#### Branch: Mint Activity ID (if not provided)
9. `core:branch` - Checks if activityId provided
   - **If no activityId**: Mint Sequence
   - **If has activityId**: Skip to prepare workspace

##### Mint Sequence (if no ID provided)
- `core:mutate` (log "No activityID provided")
- `tbc-mint:mint-ids-flow` (mint UUID)
- `tbc-system:add-minted-messages`
- `core:mutate` (extract minted ID)
- Continue to prepare workspace

#### Prepare Workspace
10. `tbc-activity:prepare-workspace` (creates/resumes activity dir)

#### Branch: Skip Synthesis (if activity already exists)
11. `core:branch` - Checks if activity log exists
    - **If exists**: Skip to feedback
    - **If not exists**: Continue to synthesize

12. `tbc-system:load-system-assets`
13. `tbc-system:log-and-clear-messages`
14. `core:mutate` (setup synthesize request)
15. `tbc-synthesize:synthesize-record-flow` (synthesize activity log)
16. `tbc-write:write-records-flow` (act/current collection)

#### Feedback
17. `core:mutate` (log success message)
18. `tbc-system:log-and-clear-messages`

---

## `tbc act show`

**Flow**: `tbc-activity:act-show-flow`

### Execution Path

1. **Start Node**: `tbc-activity:act-show-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

5. `core:mutate` (set current/backlog collections)

#### Loop: Query Current Activities
6. `core:mutate` (clear previous results)
7. `core:assign` (setup query for act/current)
8. `tbc-record:query-records-flow` (act/current)
9. `core:assign` (store IDs)
10. `tbc-record:fetch-records-flow` (act/current)
11. `core:mutate` (store loaded records)

#### Loop: Query Backlog Activities
12. `core:mutate` (clear previous results)
13. `core:assign` (setup query for act/backlog)
14. `tbc-record:query-records-flow` (act/backlog)
15. `core:assign` (store IDs)
16. `tbc-record:fetch-records-flow` (act/backlog)
17. `core:mutate` (store loaded records)

#### Format Output
18. `core:mutate` (format and display activities)
19. `tbc-system:log-and-clear-messages`

---

## `tbc act pause`

**Flow**: `tbc-activity:act-pause-flow`

### Execution Path

1. **Start Node**: `tbc-activity:act-pause-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `core:mutate` (log "Checking first...")
5. `tbc-system:log-and-clear-messages`
6. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

7. `core:mutate` (move activity from current to backlog)
   - Check if activity exists in current
   - Create backlog directory if needed
   - Rename/move directory
   - Log success/error
8. `tbc-system:log-and-clear-messages`

---

## `tbc act close`

**Flow**: `tbc-activity:act-close-flow`

### Execution Path

1. **Start Node**: `tbc-activity:act-close-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `core:mutate` (log "Checking first...")
5. `tbc-system:log-and-clear-messages`
6. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

7. `core:mutate` (set collections)

#### Branch: Check if Activity Exists
8. `core:branch` - Checks if activity exists in current
   - **If not exists**: Abort Sequence
   - **If exists**: Continue

##### Abort Sequence (activity not found)
- `core:mutate` (ACTIVITY-NOT-FOUND error)
- `tbc-system:log-and-clear-messages`

9. `core:mutate` (clear previous results)

#### Query Activity Records
10. `core:assign` (setup query for act/current/activityId)
11. `tbc-record:query-records-flow` (act/current)
12. `core:assign` (store IDs)
13. `tbc-record:fetch-records-flow` (fetch activity records)

#### Prepare and Store to Memory
14. `core:mutate` (prepare activeDrafts)
15. `tbc-system:prepare-records-manifest`
16. `tbc-system:add-manifest-messages` (if verbose)
17. `tbc-write:write-records-flow` (mem collection, with syncIndex)

#### Archive Activity
18. `core:mutate` (move activity to archive)
    - Create archive directory
    - Rename/move activity directory
    - Log success
19. `tbc-system:log-and-clear-messages`

---

## `tbc int probe`

**Flow**: `tbc-interface:int-probe-flow`

### Execution Path

1. **Start Node**: `tbc-interface:int-probe-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)
5. `tbc-system:probe` (probe environment)
6. `tbc-system:log-and-clear-messages`

---

## `tbc int generic`

**Flow**: `tbc-interface:agent-integrate-flow` (agentType: generic)

### Execution Path

1. **Start Node**: `tbc-interface:agent-integrate-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

5. `tbc-system:load-system-assets`
6. `core:mutate` (setup synthesize request for role-definition)
7. `tbc-synthesize:synthesize-value-flow`
8. `core:mutate` (clear records)

#### Load Assets
9. `tbc-interface:load-generic-assets`

#### Synthesize and Write
10. `core:mutate` (setup synthesize request for generic)
11. `tbc-synthesize:synthesize-record-flow` (synthesize integration records)
12. `tbc-write:write-records-flow` (root collection)

#### Feedback
13. `core:mutate` (log success message)
14. `tbc-system:log-and-clear-messages`

---

## `tbc int gemini-cli`

**Flow**: `tbc-interface:agent-integrate-flow` (agentType: gemini-cli)

### Execution Path

1. **Start Node**: `tbc-interface:agent-integrate-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

5. `tbc-system:load-system-assets`
6. `core:mutate` (setup synthesize request for role-definition)
7. `tbc-synthesize:synthesize-value-flow`
8. `core:mutate` (clear records)

#### Load Assets
9. `tbc-gemini:load-assets`

#### Synthesize and Write
10. `core:mutate` (setup synthesize request for gemini-cli)
11. `tbc-gemini:synthesize-integration-records`
12. `tbc-synthesize:synthesize-record-flow`
13. `tbc-write:write-records-flow` (root collection)

#### Feedback
14. `core:mutate` (log success message)
15. `tbc-system:log-and-clear-messages`

---

## `tbc int goose`

**Flow**: `tbc-interface:agent-integrate-flow` (agentType: goose)

### Execution Path

1. **Start Node**: `tbc-interface:agent-integrate-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

5. `tbc-system:load-system-assets`
6. `core:mutate` (setup synthesize request for role-definition)
7. `tbc-synthesize:synthesize-value-flow`
8. `core:mutate` (clear records)

#### Load Assets
9. `tbc-goose:load-assets`

#### Synthesize and Write
10. `core:mutate` (setup synthesize request for goose)
11. `tbc-goose:synthesize-integration-records`
12. `tbc-synthesize:synthesize-record-flow`
13. `tbc-write:write-records-flow` (root collection)

#### Feedback
14. `core:mutate` (log success message)
15. `tbc-system:log-and-clear-messages`

---

## `tbc int github-copilot`

**Flow**: `tbc-interface:agent-integrate-flow` (agentType: github-copilot)

### Execution Path

1. **Start Node**: `tbc-interface:agent-integrate-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

5. `tbc-system:load-system-assets`
6. `core:mutate` (setup synthesize request for role-definition)
7. `tbc-synthesize:synthesize-value-flow`
8. `core:mutate` (clear records)

#### Load Assets
9. `tbc-github-copilot:load-assets`

#### Synthesize and Write
10. `core:mutate` (setup synthesize request for github-copilot)
11. `tbc-github-copilot:synthesize-integration-records`
12. `tbc-synthesize:synthesize-record-flow`
13. `tbc-write:write-records-flow` (root collection)

#### Feedback
14. `core:mutate` (log success message)
15. `tbc-system:log-and-clear-messages`

---

## `tbc int kilocode`

**Flow**: `tbc-interface:agent-integrate-flow` (agentType: kilocode)

### Execution Path

1. **Start Node**: `tbc-interface:agent-integrate-flow-start`
2. `tbc-system:prepare-messages`
3. `tbc-system:resolve-root-directory`
4. `tbc-system:validate-flow` (with resolveProtocol)

#### Branch: Abort if Not Valid
- `core:branch` - Checks if `validationResult.success`
  - **If abort**: `core:mutate` (OVERWRITE-GUARD error) → `tbc-system:log-and-clear-messages`
  - **If default**: Continue

5. `tbc-system:load-system-assets`
6. `core:mutate` (setup synthesize request for role-definition)
7. `tbc-synthesize:synthesize-value-flow`
8. `core:mutate` (clear records)

#### Load Assets
9. `tbc-kilocode:load-assets`

#### Synthesize and Write
10. `core:mutate` (setup synthesize request for kilocode)
11. `tbc-kilocode:synthesize-integration-records`
12. `tbc-synthesize:synthesize-record-flow`
13. `tbc-write:write-records-flow` (root collection)

#### Feedback
14. `core:mutate` (log success message)
15. `tbc-system:log-and-clear-messages`

---

## Summary of Branch Conditions

| Command | Branch | Condition |
|---------|--------|-----------|
| `tbc sys init` | Overwrite Guard | `validationResult.success` → abort if true |
| `tbc sys init` | Validate Again | `validationResult.success` → abort if false |
| `tbc sys upgrade` | Abort | `validationResult.success` → abort if false |
| `tbc sys validate` | Resolve Protocol | `resolveProtocol` config option |
| `tbc dex rebuild` | Abort | `validationResult.success` → abort if false |
| `tbc mem remember` | Abort | `validationResult.success` → abort if false |
| `tbc mem recall` | Abort | `validationResult.success` → abort if false |
| `tbc mem recall` | Query Type | Query = "companion"/"who am i" → identity-companion; Query = "prime"/"who is my prime" → identity-prime; else → continue |
| `tbc act start` | Abort | `validationResult.success` → abort if false |
| `tbc act start` | Mint ID | `activityId` not provided → mint new ID |
| `tbc act start` | Skip Synthesis | Activity log exists → skip synthesis |
| `tbc act show` | Abort | `validationResult.success` → abort if false |
| `tbc act pause` | Abort | `validationResult.success` → abort if false |
| `tbc act close` | Abort | `validationResult.success` → abort if false |
| `tbc act close` | Activity Exists | Activity in current → continue; else → abort |
| `tbc int *` (all) | Abort | `validationResult.success` → abort if false |

---

*Report generated from TBC CLI source code analysis*

import { createPlugin } from "@hami-frameworx/core";

import { GenerateActivityIdNode } from "./ops/generate-activity-id.js";
import { CheckActivityStateNode } from "./ops/check-activity-state.js";
import { MoveActivityDirectoryNode } from "./ops/move-activity-directory.js";
import { CreateActivityLogStubNode } from "./ops/create-activity-log-stub.js";
import { AssimilateLogsNode } from "./ops/assimilate-logs.js";
import { ValidateStartStateNode } from "./ops/validate-start-state.js";
import { ActBacklogFlow } from "./ops/act-backlog-flow.js";
import { ValidateBacklogStateNode } from "./ops/validate-backlog-state.js";
import { ActCloseFlow } from "./ops/act-close-flow.js";
import { ValidateCloseStateNode } from "./ops/validate-close-state.js";
import { PrepareCloseRecordsNode } from "./ops/prepare-close-records.js";
import { RemoveActivityRecordsNode } from "./ops/remove-activity-records.js";
import { ListActivityDirectoriesNode } from "./ops/list-activity-directories.js";
import { ActStartFlow } from "./ops/act-start-flow.js";
import { ActShowFlow } from "./ops/act-show-flow.js";
import { PrepareWorkspaceNode } from "./ops/prepare-workspace.js";

/**
 * TBC Activity Plugin for HAMI.
 * Provides activity operations for TBC.
 *
 * Included operations:
 * - `tbc-activity:generate-activity-id`: Generates or uses provided activity ID
 * - `tbc-activity:check-activity-state`: Checks activity state in backlog/current/archive
 * - `tbc-activity:move-activity-directory`: Moves activity directories between states
 * - `tbc-activity:create-activity-log-stub`: Creates activity log stub records
 * - `tbc-activity:assimilate-logs`: Prepares for log assimilation
 * - `tbc-activity:validate-start-state`: Validates state for start operation
 * - `tbc-activity:validate-backlog-state`: Validates state for backlog operation
 * - `tbc-activity:validate-close-state`: Validates state for close operation
 * - `tbc-activity:remove-activity-records`: Removes record files from current activity directory
 * - `tbc-activity:list-activity-directories`: Lists activity directories in current and backlog
 * - Activity flows for start, backlog, close, and show operations
 * - `tbc-activity:act-start-flow`: Flow for starting an activity
 * - `tbc-activity:act-show-flow`: Flow for showing current and backlog activities
 * - `tbc-activity:prepare-workspace`: Prepares workspace for activity
 */
const TBCActivityPlugin = createPlugin(
    "@tbc-frameworx/tbc-activity",
    "0.1.0",
    [
        GenerateActivityIdNode as any,
        CheckActivityStateNode as any,
        MoveActivityDirectoryNode as any,
        CreateActivityLogStubNode as any,
        AssimilateLogsNode as any,
        ValidateStartStateNode as any,
        ValidateBacklogStateNode as any,
        ActBacklogFlow as any,
        ValidateCloseStateNode as any,
        ActCloseFlow as any,
        PrepareCloseRecordsNode as any,
        RemoveActivityRecordsNode as any,
        ListActivityDirectoriesNode as any,
        // refactored and new nodes and flows
        PrepareWorkspaceNode as any,
        ActStartFlow as any,
        ActShowFlow as any,
    ],
    "TBC Activity Plugin - Activity operations for TBC",
);

export { TBCActivityPlugin };
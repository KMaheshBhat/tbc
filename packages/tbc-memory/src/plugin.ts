import { createPlugin } from "@hami-frameworx/core";

import { RememberFlow } from "./ops/remember-flow.js";
import { RecallFlow } from "./ops/recall-flow.js";
import { AddRecallMessagesNode } from "./ops/add-recall-messages.js";

/**
 * TBC Memory Plugin for HAMI.
 * Provides memory operations for TBC.
 *
 * Included operations:
 * - `tbc-memory:remember-flow`: Creates a memory records
 * - `tbc-memory:recall-flow`: Retrieves identity and memory records
 * - `tbc-memory:add-recall-messages`: Adds recalled records from view into system messsages
 * - Memory flows for companion operations
 */
const TBCMemoryPlugin = createPlugin(
    "@tbc-frameworx/tbc-memory",
    "0.1.0",
    [
        RememberFlow as any,
        RecallFlow as any,
        AddRecallMessagesNode as any,
    ],
    "TBC Memory Plugin - Memory operations for TBC",
);

export { TBCMemoryPlugin };
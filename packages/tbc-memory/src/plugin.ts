import { createPlugin, HAMIFlow, HAMINode } from '@hami-frameworx/core';

import { AddRecallMessagesNode } from './ops/add-recall-messages.js';

import { RecallFlow } from './ops/recall-flow.js';
import { RememberFlow } from './ops/remember-flow.js';
import { AssimilateFlow } from './ops/assimilate-flow.js';

/**
 * TBC Memory Plugin for HAMI.
 * Provides memory operations for TBC.
 *
 * Included operations:
 * - Nodes:
 *   - `tbc-memory:add-recall-messages`: Adds recalled records from view into system messages
 * - Flows:
 *   - `tbc-memory:recall-flow`: Retrieves identity and memory records
 *   - `tbc-memory:remember-flow`: Creates memory records
 *   - `tbc-memory:assimilate-flow`: Replicates memory records across all RecordStore providers
 */
const TBCMemoryPlugin = createPlugin(
    '@tbc-frameworx/tbc-memory',
    '0.1.0',
    [
        // Nodes
        AddRecallMessagesNode,
        // Flows
        RecallFlow,
        RememberFlow,
        AssimilateFlow,
    ] as unknown as (typeof HAMINode | typeof HAMIFlow)[],
    'TBC Memory Plugin - Memory operations for TBC',
);

export { TBCMemoryPlugin };

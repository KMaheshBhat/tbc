import { createPlugin } from '@hami-frameworx/core';

import { AddRecallMessagesNode } from './ops/add-recall-messages.js';

import { RecallFlow } from './ops/recall-flow.js';
import { RememberFlow } from './ops/remember-flow.js';

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
 */
const TBCMemoryPlugin = createPlugin(
    '@tbc-frameworx/tbc-memory',
    '0.1.0',
    [
        // Nodes
        AddRecallMessagesNode as any,
        // Flows
        RecallFlow,
        RememberFlow,
    ],
    'TBC Memory Plugin - Memory operations for TBC',
);

export { TBCMemoryPlugin };

import { createPlugin } from '@hami-frameworx/core';

import { AddRecallMessagesNode } from './ops/add-recall-messages.js';
import { RememberFlowNx } from './ops/remember-flow-nx.js';
import { RecallFlowNx } from './ops/recall-flow-nx.js';

/**
 * TBC Memory Plugin for HAMI.
 * Provides memory operations for TBC.
 *
 * Included operations:
 * - `tbc-memory:add-recall-messages`: Adds recalled records from view into system messsages
 * - Memory flows for companion operations
 * - `tbc-memory:remember-flow:nx`: Creates a memory records (nx version)
 * - `tbc-memory:recall-flow:nx`: Retrieves identity and memory records (nx version)
 */
const TBCMemoryPlugin = createPlugin(
    '@tbc-frameworx/tbc-memory',
    '0.1.0',
    [
        AddRecallMessagesNode as any,
        RememberFlowNx,
        RecallFlowNx,
    ],
    'TBC Memory Plugin - Memory operations for TBC',
);

export { TBCMemoryPlugin };

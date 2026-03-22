import { createPlugin } from '@hami-frameworx/core';

import { PrepareWorkspaceNode } from './ops/prepare-workspace.js';

import { ActCloseFlow } from './ops/act-close-flow.js';
import { ActPauseFlow } from './ops/act-pause-flow.js';
import { ActShowFlow } from './ops/act-show-flow.js';
import { ActStartFlow } from './ops/act-start-flow.js';

/**
 * TBC Activity Plugin for HAMI.
 * Provides activity operations for TBC.
 *
 * Included operations:
 * - Nodes:
 *   - `tbc-activity:prepare-workspace`: Prepares workspace for activity
 * - Flows:
 *   - `tbc-activity:act-close-flow`: Flow for closing an activity
 *   - `tbc-activity:act-pause-flow`: Flow for pausing an activity
 *   - `tbc-activity:act-show-flow`: Flow for showing current and backlog activities
 *   - `tbc-activity:act-start-flow`: Flow for starting an activity
 */
const TBCActivityPlugin = createPlugin(
    '@tbc-frameworx/tbc-activity',
    '0.1.0',
    [
        // Nodes
        PrepareWorkspaceNode as any,
        // Flows
        ActCloseFlow as any,
        ActPauseFlow as any,
        ActShowFlow as any,
        ActStartFlow as any,
    ],
    'TBC Activity Plugin - Activity operations for TBC',
);

export { TBCActivityPlugin };

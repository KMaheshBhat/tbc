import { createPlugin } from '@hami-frameworx/core';

import { ActStartFlow } from './ops/act-start-flow.js';
import { ActShowFlow } from './ops/act-show-flow.js';
import { ActPauseFlow } from './ops/act-pause-flow.js';
import { ActCloseFlow } from './ops/act-close-flow.js';
import { PrepareWorkspaceNode } from './ops/prepare-workspace.js';

/**
 * TBC Activity Plugin for HAMI.
 * Provides activity operations for TBC.
 *
 * Included operations:
 * - `tbc-activity:act-start-flow`: Flow for starting an activity
 * - `tbc-activity:act-show-flow`: Flow for showing current and backlog activities
 * - `tbc-activity:act-pause-flow`: Flow for pausing an activity
 * - `tbc-activity:act-pause-flow`: Flow for closing an activity
 * - `tbc-activity:prepare-workspace`: Prepares workspace for activity
 */
const TBCActivityPlugin = createPlugin(
    '@tbc-frameworx/tbc-activity',
    '0.1.0',
    [
        PrepareWorkspaceNode as any,
        ActStartFlow as any,
        ActShowFlow as any,
        ActPauseFlow as any,
        ActCloseFlow as any,
    ],
    'TBC Activity Plugin - Activity operations for TBC',
);

export { TBCActivityPlugin };

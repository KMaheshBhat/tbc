import { createPlugin } from '@hami-frameworx/core';

import { PrepareWorkspaceNode } from './ops/prepare-workspace.js';

import { ActStartFlowNx } from './ops/act-start-flow-nx.js';
import { ActShowFlowNx } from './ops/act-show-flow-nx.js';
import { ActPauseFlowNx } from './ops/act-pause-flow-nx.js';
import { ActCloseFlowNx } from './ops/act-close-flow-nx.js';

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
        ActStartFlowNx as any,
        ActShowFlowNx as any,
        ActPauseFlowNx as any,
        ActCloseFlowNx as any,
    ],
    'TBC Activity Plugin - Activity operations for TBC',
);

export { TBCActivityPlugin };

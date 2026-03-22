import { createPlugin } from '@hami-frameworx/core';

import { LoadGenericAssetsNode } from './ops/load-generic-asset.js';
import { SynthesizeGenericRecordsNode } from './ops/synthesize-generic-records.js';

import { AgentIntegrateFlow } from './ops/agent-integrate-flow.js';
import { IntProbeFlow } from './ops/int-probe-flow.js';

/**
 * TBC Interface Plugin for HAMI.
 * Provides interface operations for TBC.
 *
 * Included operations:
 * - Nodes:
 *   - `tbc-interface:load-generic-assets`: Loads generic assets into shared stage records
 *   - `tbc-interface:synthetize-generic-records`: Synthetize agent records (AGENTS.md) for generic interface
 * - Flows:
 *   - `tbc-interface:agent-integrate-flow`: Generate files required for agent integrations
 *   - `tbc-interface:int-probe-flow`: Comprehensive flow for probing TBC environment
 */
const TBCInterfacePlugin = createPlugin(
    '@tbc-frameworx/tbc-interface',
    '0.1.0',
    [
        // Nodes
        LoadGenericAssetsNode as any,
        SynthesizeGenericRecordsNode as any,
        // Flows
        AgentIntegrateFlow as any,
        IntProbeFlow as any,
    ],
    'TBC Interface Plugin - Interface operations for TBC',
);

export { TBCInterfacePlugin };

import { createPlugin } from '@hami-frameworx/core';

import { LoadGenericAssetsNode } from './ops/load-generic-asset.js';
import { SynthesizeGenericRecordsNode } from './ops/synthesize-generic-records.js';

import { AgentIntegrateFlowNx } from './ops/agent-integrate-flow-nx.js';
import { IntProbeFlowNx } from './ops/int-probe-flow-nx.js';

/**
 * TBC Interface Plugin for HAMI.
 * Provides interface operations for TBC.
 *
 * Included operations:
 * - Interface flows for various tools (Kilo Code, Goose, GitHub Copilot, etc.)
 * - need to write in following format:
 * - `tbc-interface:int-probe-flow`: Comprehensive flow for probing TBC environment
 * - `tbc-interface:agent-integrate-flow`: Generate files required for agent integrations
 * - `tbc-interface:load-generic-assets`: Loads generic assets into shared stage records
 * - `tbc-interface:synthetize-generic-records`: Synthetize agent records (AGENTS.md) for generic interface
 */
const TBCInterfacePlugin = createPlugin(
    '@tbc-frameworx/tbc-interface',
    '0.1.0',
    [
        LoadGenericAssetsNode as any,
        SynthesizeGenericRecordsNode as any,
        IntProbeFlowNx as any,
        AgentIntegrateFlowNx as any,
    ],
    'TBC Interface Plugin - Interface operations for TBC',
);

export { TBCInterfacePlugin };

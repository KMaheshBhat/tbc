import { createPlugin, HAMIFlow, HAMINode } from '@hami-frameworx/core';

import { LoadAssetsNode } from './ops/load-assets.js';
import { SynthesizeIntegrationRecordsNode } from './ops/synthesize-integration-records.js';

const TBCPiPlugin = createPlugin(
    '@tbc-frameworx/tbc-pi',
    '0.1.0',
    [
        LoadAssetsNode,
        SynthesizeIntegrationRecordsNode,
    ] as (typeof HAMINode | typeof HAMIFlow)[],
    'TBC Pi Plugin - Operations for Pi agent integration',
);

export { TBCPiPlugin };